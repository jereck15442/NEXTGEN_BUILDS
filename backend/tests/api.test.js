import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { Cart } from '../src/models/Cart.js';
import { Coupon } from '../src/models/Coupon.js';
import { Order } from '../src/models/Order.js';
import { WebhookEvent } from '../src/models/WebhookEvent.js';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}), Product.deleteMany({}), Cart.deleteMany({}), Coupon.deleteMany({}),
    Order.deleteMany({}), WebhookEvent.deleteMany({})
  ]);
});

async function registerAndLogin(role = 'customer') {
  const password = 'Password123!';
  const user = await User.create({
    name: role === 'admin' ? 'Admin' : 'Customer',
    email: `${role}-${Date.now()}@example.com`,
    passwordHash: await bcrypt.hash(password, 12),
    role
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email: user.email, password });
  return { user, token: login.body.token };
}

describe('authentication and authorization', () => {
  it('registers a customer and rejects invalid login', async () => {
    const registered = await request(app).post('/api/v1/auth/register').send({
      name: 'Jereck', email: 'jereck@example.com', password: 'Password123!'
    });
    expect(registered.status).toBe(201);
    expect(registered.body.passwordHash).toBeUndefined();

    const rejected = await request(app).post('/api/v1/auth/login').send({
      email: 'jereck@example.com', password: 'WrongPassword!'
    });
    expect(rejected.status).toBe(401);
  });

  it('returns 422 with issue details for invalid input', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: '', email: 'not-an-email', password: 'short'
    });
    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation error');
    expect(Array.isArray(response.body.details)).toBe(true);
    expect(response.body.details.length).toBeGreaterThan(0);
  });

  it('requires admin role for product creation', async () => {
    const customer = await registerAndLogin();
    const response = await request(app).post('/api/v1/products')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ name: 'CPU', category: 'CPU', price: 100, stock: 2 });
    expect(response.status).toBe(403);
  });
});

describe('product listing', () => {
  it('applies pagination and price sorting, and ignores unknown sort keys', async () => {
    await Product.create([
      { name: 'Budget CPU', category: 'CPU', price: 100, stock: 1 },
      { name: 'Flagship CPU', category: 'CPU', price: 900, stock: 1 }
    ]);

    const response = await request(app).get('/api/v1/products?limit=1&sort=price_asc');
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].price).toBe(100);
    expect(response.body.pagination).toMatchObject({ page: 1, limit: 1, total: 2, pages: 2 });

    const unknownSort = await request(app).get('/api/v1/products?sort=__proto__');
    expect(unknownSort.status).toBe(200);
    expect(unknownSort.body.items).toHaveLength(2);
  });
});

describe('checkout and stock', () => {
  it('rejects cart quantities above stock and succeeds checkout atomically', async () => {
    const customer = await registerAndLogin();
    const product = await Product.create({ name: 'Test CPU', category: 'CPU', price: 5000, stock: 1, specifications: { socket: 'AM5' } });

    await request(app).post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: product._id.toString(), quantity: 1 });
    const overStock = await request(app).patch(`/api/v1/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quantity: 2 });
    expect(overStock.status).toBe(409);

    const created = await request(app).post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(created.status).toBe(201);
    expect(created.body.order.total).toBe(5000);
    expect(created.body.payment).toMatchObject({ provider: 'sandbox', checkoutUrl: null });
    expect(created.body.payment.reference).toBe(`TEST-${created.body.order._id}`);
    const updated = await Product.findById(product._id);
    expect(updated.stock).toBe(0);
  });
});

describe('compatibility', () => {
  it('reports socket mismatch', async () => {
    const cpu = await Product.create({ name: 'Intel CPU', category: 'CPU', price: 100, stock: 1, specifications: { socket: 'LGA1700' } });
    const board = await Product.create({ name: 'AMD Board', category: 'motherboard', price: 100, stock: 1, specifications: { socket: 'AM5' } });
    const response = await request(app).post('/api/v1/compatibility/check').send({
      components: { CPU: cpu._id.toString(), motherboard: board._id.toString() }
    });
    expect(response.status).toBe(200);
    expect(response.body.compatible).toBe(false);
    expect(response.body.warnings.some((warning) => warning.code === 'SOCKET_MISMATCH')).toBe(true);
  });
});

describe('coupons and builds', () => {
  it('applies a coupon using a case-insensitive code', async () => {
    const customer = await registerAndLogin();
    const product = await Product.create({ name: 'Coupon CPU', category: 'CPU', price: 5000, stock: 5 });
    await Coupon.create({
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10,
      validFrom: new Date(Date.now() - 86_400_000),
      validUntil: new Date(Date.now() + 86_400_000)
    });

    await request(app).post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: product._id.toString(), quantity: 1 });

    const applied = await request(app).post('/api/v1/coupons/apply')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ code: 'save10' });

    expect(applied.status).toBe(200);
    expect(applied.body).toMatchObject({ code: 'SAVE10', discountType: 'percentage', discountValue: 10 });
  });

  it('validates a build and reports incompatibility', async () => {
    const customer = await registerAndLogin();
    const cpu = await Product.create({ name: 'Intel CPU', category: 'CPU', price: 100, stock: 1, specifications: { socket: 'LGA1700' } });
    const board = await Product.create({ name: 'AMD Board', category: 'motherboard', price: 100, stock: 1, specifications: { socket: 'AM5' } });

    const response = await request(app).post('/api/v1/builds/validate')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ components: { CPU: cpu._id.toString(), motherboard: board._id.toString() } });

    expect(response.status).toBe(200);
    expect(response.body.estimatedPrice).toBe(200);
    expect(response.body.compatible).toBe(false);
  });
});

describe('admin product management', () => {
  it('creates, updates, lists low stock, and deactivates a product', async () => {
    const admin = await registerAndLogin('admin');

    const created = await request(app).post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Admin GPU', category: 'GPU', price: 1000, stock: 2,
        lowStockThreshold: 3, specifications: { powerWatts: 100 }
      });
    expect(created.status).toBe(201);

    const lowStock = await request(app).get('/api/v1/products/admin/low-stock')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(lowStock.status).toBe(200);
    expect(lowStock.body.items.some((item) => item._id === created.body._id)).toBe(true);

    const updated = await request(app).patch(`/api/v1/products/${created.body._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ price: 1200 });
    expect(updated.status).toBe(200);
    expect(updated.body.price).toBe(1200);

    const removed = await request(app).delete(`/api/v1/products/${created.body._id}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(removed.status).toBe(200);
    expect(removed.body.active).toBe(false);
  });
});

describe('order cancellation', () => {
  it('restores reserved stock when a pending order is cancelled', async () => {
    const customer = await registerAndLogin();
    const product = await Product.create({ name: 'Cancel CPU', category: 'CPU', price: 1000, stock: 2 });

    await request(app).post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: product._id.toString(), quantity: 1 });
    const created = await request(app).post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(created.status).toBe(201);
    expect((await Product.findById(product._id)).stock).toBe(1);

    const cancelled = await request(app).post(`/api/v1/orders/${created.body.order._id}/cancel`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.paymentStatus).toBe('cancelled');
    expect((await Product.findById(product._id)).stock).toBe(2);
  });
});

describe('saved builds', () => {
  it('saves a build and adds its components to the cart', async () => {
    const customer = await registerAndLogin();
    const cpu = await Product.create({
      name: 'Build CPU', category: 'CPU', price: 1000, stock: 3, specifications: { socket: 'AM5' }
    });

    const saved = await request(app).post('/api/v1/builds')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ name: 'My PC', components: { CPU: cpu._id.toString() } });
    expect(saved.status).toBe(201);

    const added = await request(app).post(`/api/v1/builds/${saved.body._id}/cart`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(added.status).toBe(201);
    expect(added.body.cart.items).toHaveLength(1);
  });
});

describe('admin order status', () => {
  it('moves a pending order to processing and blocks illegal jumps', async () => {
    const admin = await registerAndLogin('admin');
    const customer = await registerAndLogin();
    const product = await Product.create({ name: 'Status CPU', category: 'CPU', price: 1000, stock: 2 });

    await request(app).post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: product._id.toString(), quantity: 1 });
    const created = await request(app).post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer.token}`);
    const orderId = created.body.order._id;

    const advanced = await request(app).patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ fulfillmentStatus: 'processing' });
    expect(advanced.status).toBe(200);

    const illegal = await request(app).patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ fulfillmentStatus: 'pending' });
    expect(illegal.status).toBe(409);

    const all = await request(app).get('/api/v1/orders/admin/all')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(all.status).toBe(200);
    expect(all.body.items.some((order) => order._id === orderId)).toBe(true);
  });
});

describe('Maya webhooks', () => {
  async function placeOrder(customer) {
    const product = await Product.create({
      name: `Webhook CPU ${Date.now()}`,
      category: 'CPU',
      price: 1000,
      stock: 3
    });
    await request(app).post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: product._id.toString(), quantity: 2 });
    const created = await request(app).post('/api/v1/orders')
      .set('Authorization', `Bearer ${customer.token}`);
    return { product, order: created.body.order };
  }

  function webhookPayload(order, overrides = {}) {
    return {
      id: order.paymentReference || `chk_${order._id}`,
      requestReferenceNumber: order._id,
      paymentStatus: 'PAYMENT_SUCCESS',
      status: 'COMPLETED',
      totalAmount: { value: order.total, currency: 'PHP' },
      ...overrides
    };
  }

  it('marks an order paid, records the checkout id, and ignores duplicates', async () => {
    const customer = await registerAndLogin();
    const { order } = await placeOrder(customer);
    const payload = webhookPayload(order);

    const first = await request(app).post('/api/v1/payments/webhook').send(payload);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ received: true, status: 'paid' });

    const stored = await Order.findById(order._id);
    expect(stored.paymentStatus).toBe('paid');
    expect(stored.paymentReference).toBe(payload.id);
    expect(stored.paidAt).toBeInstanceOf(Date);

    const duplicate = await request(app).post('/api/v1/payments/webhook').send(payload);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.duplicate).toBe(true);
  });

  it('releases reserved stock when Maya reports a failed payment', async () => {
    const customer = await registerAndLogin();
    const { product, order } = await placeOrder(customer);
    expect((await Product.findById(product._id)).stock).toBe(1);

    const response = await request(app).post('/api/v1/payments/webhook')
      .send(webhookPayload(order, { paymentStatus: 'PAYMENT_FAILED', status: 'FAILED' }));

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('failed');

    const stored = await Order.findById(order._id);
    expect(stored.paymentStatus).toBe('failed');
    expect(stored.reserved).toBe(false);
    expect((await Product.findById(product._id)).stock).toBe(3);
  });

  it('ignores a webhook whose amount does not match the order', async () => {
    const customer = await registerAndLogin();
    const { order } = await placeOrder(customer);

    const response = await request(app).post('/api/v1/payments/webhook')
      .send(webhookPayload(order, { totalAmount: { value: 1, currency: 'PHP' } }));

    expect(response.status).toBe(200);
    expect(response.body.ignored).toBe('amount_mismatch');
    expect((await Order.findById(order._id)).paymentStatus).toBe('pending');
  });

  it('accepts events for unknown orders without failing', async () => {
    const response = await request(app).post('/api/v1/payments/webhook').send({
      id: 'chk_unknown',
      requestReferenceNumber: '507f1f77bcf86cd799439011',
      paymentStatus: 'PAYMENT_SUCCESS',
      totalAmount: { value: 100, currency: 'PHP' }
    });

    expect(response.status).toBe(200);
    expect(response.body.ignored).toBe('order_not_found');
  });
});
