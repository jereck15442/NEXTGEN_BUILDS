import { cartRepository } from '../repositories/cart.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { conflict, notFound } from '../utils/errors.js';

async function getOrCreateCart(userId) {
  const cart = await cartRepository.findPopulatedByUser(userId);
  return cart ?? cartRepository.createForUser(userId);
}

export function getCart(userId) {
  return getOrCreateCart(userId);
}

export async function addItem(userId, { productId, quantity }) {
  const product = await productRepository.findActiveById(productId);
  if (!product) throw conflict('Product is inactive or unavailable');
  if (product.stock < quantity) throw conflict('Insufficient stock');

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((item) => item.product._id?.toString() === productId);
  if (existing) existing.quantity += quantity;
  else cart.items.push({ product: product._id, quantity });

  await cart.save();
  return cart;
}

export async function updateItem(userId, productId, quantity) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.find((entry) => entry.product._id?.toString() === productId);
  if (!item) throw notFound('Cart item not found');

  const product = await productRepository.findActiveById(productId);
  if (!product) throw conflict('Product is inactive or unavailable');
  if (product.stock < quantity) throw conflict('Insufficient stock');

  item.quantity = quantity;
  await cart.save();
  return cart;
}

export async function removeItem(userId, productId) {
  const cart = await getOrCreateCart(userId);
  cart.items = cart.items.filter((item) => item.product._id?.toString() !== productId);
  await cart.save();
  return cart;
}
