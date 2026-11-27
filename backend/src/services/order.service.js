import mongoose from 'mongoose';
import { cartRepository } from '../repositories/cart.repository.js';
import { couponRepository } from '../repositories/coupon.repository.js';
import { orderRepository } from '../repositories/order.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { getDiscountStrategy } from '../patterns/pricing/discount-strategy.factory.js';
import { orderEvents } from '../patterns/observers/index.js';
import { clampDiscount, sumLineItems } from '../utils/money.js';
import { conflict, forbidden, notFound, unprocessable } from '../utils/errors.js';
import { validateCoupon } from './coupon.service.js';
import * as paymentService from './payment.service.js';
import { Address } from '../models/Address.js';

export const LEGAL_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

export function canTransition(from, to) {
  return Boolean(LEGAL_TRANSITIONS[from]?.includes(to));
}

export async function prepareOrder(userId) {
  const cart = await cartRepository.findPopulatedByUser(userId);
  if (!cart || cart.items.length === 0) throw unprocessable('Cart is empty');

  const items = [];
  for (const item of cart.items) {
    if (item.quantity < 1) throw unprocessable('Quantity must be greater than zero');
    if (!item.product) throw conflict('A product in your cart is unavailable');

    const product = await productRepository.findById(item.product._id);
    if (!product || !product.active) throw conflict(`Product ${item.product.name} is unavailable`);
    if (product.stock < item.quantity) throw conflict(`Insufficient stock for ${product.name}`);

    items.push({ product: product._id, name: product.name, price: product.price, quantity: item.quantity });
  }

  const subtotal = sumLineItems(items);
  let discount = 0;
  let coupon = null;

  if (cart.couponCode) {
    coupon = await couponRepository.findByCode(cart.couponCode);
    const result = validateCoupon(coupon, subtotal);
    if (!result.valid) throw unprocessable(result.message);
    discount = clampDiscount(
      subtotal,
      getDiscountStrategy(coupon.discountType).calculate(subtotal, coupon.discountValue)
    );
  }

  return { userId, cart, items, subtotal, discount, total: subtotal - discount, coupon };
}

export async function commitOrder(prepared, orderId, payment, orderAddress) {
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      for (const item of prepared.items) {
        const result = await productRepository.decrementStock(item.product, item.quantity, session);
        if (result.modifiedCount !== 1) throw conflict(`Insufficient stock for ${item.name}`);
      }

      if (prepared.coupon) {
        const result = await couponRepository.incrementUsage(prepared.coupon, session);
        if (result.modifiedCount !== 1) throw unprocessable('Coupon is no longer available');
      }

      const addressData = orderAddress
        ? {
          fullName: orderAddress.fullName,
          phoneNumber: orderAddress.phoneNumber,
          region: orderAddress.region,
          province: orderAddress.province,
          city: orderAddress.city,
          barangay: orderAddress.barangay,
          postalCode: orderAddress.postalCode,
          streetName: orderAddress.streetName,
          building: orderAddress.building,
          houseNo: orderAddress.houseNo,
          label: orderAddress.label
        }
        : {};

      order = await orderRepository.create({
        _id: orderId,
        user: prepared.userId,
        items: prepared.items,
        subtotal: prepared.subtotal,
        discount: prepared.discount,
        total: prepared.total,
        couponCode: prepared.coupon?.code || null,
        paymentStatus: 'pending',
        fulfillmentStatus: 'pending',
        paymentProvider: payment.provider,
        paymentReference: payment.reference,
        checkoutUrl: payment.checkoutUrl,
        reserved: true,
        address: addressData
      }, session);
    });
  } finally {
    await session.endSession();
  }

  prepared.cart.items = [];
  prepared.cart.couponCode = null;
  await prepared.cart.save();
  return order;
}

export async function createOrder(userId, addressId) {
  const prepared = await prepareOrder(userId);

  // Fetch the selected address and include it in the order
  let selectedAddress = null;
  if (addressId) {
    const address = await Address.findOne({ _id: addressId, user: userId });
    if (address) {
      selectedAddress = address;
    }
  }

  const orderAddress = selectedAddress;

  const orderId = new mongoose.Types.ObjectId();

  const payment = await paymentService.createCheckout({
    _id: orderId,
    user: userId,
    items: prepared.items,
    subtotal: prepared.subtotal,
    discount: prepared.discount,
    total: prepared.total
  });

  const order = await commitOrder(prepared, orderId, payment, orderAddress);
  return { order, payment };
}

export async function listOrders(userId, { page = 1, limit = 20 } = {}) {
  const [items, total] = await Promise.all([
    orderRepository.findPage({ filter: { user: userId }, skip: (page - 1) * limit, limit }),
    orderRepository.count({ user: userId })
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function listAllOrders({ page = 1, limit = 20 } = {}) {
  const [items, total] = await Promise.all([
    orderRepository.findPage({ skip: (page - 1) * limit, limit }),
    orderRepository.count()
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getOrder(orderId, user) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw notFound('Order not found');
  if (order.user.toString() !== user._id.toString() && user.role !== 'admin') throw forbidden('Forbidden');
  return order;
}

export async function cancelOrder(orderId, userId) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw notFound('Order not found');
  if (order.user.toString() !== userId.toString()) throw forbidden('Forbidden');
  if (order.paymentStatus !== 'pending') throw conflict('Invalid state transition');

  order.paymentStatus = 'cancelled';
  order.fulfillmentStatus = 'cancelled';
  await order.save();
  await orderEvents.emit('order.cancelled', order);
  return order;
}

export async function updateFulfillmentStatus(orderId, fulfillmentStatus) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw notFound('Order not found');
  if (!canTransition(order.fulfillmentStatus, fulfillmentStatus)) throw conflict('Invalid state transition');

  order.fulfillmentStatus = fulfillmentStatus;
  await order.save();
  await orderEvents.emit('order.status_changed', order);
  return order;
}
