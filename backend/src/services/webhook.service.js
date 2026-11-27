import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { orderRepository } from '../repositories/order.repository.js';
import { webhookEventRepository } from '../repositories/webhook-event.repository.js';
import { orderEvents } from '../patterns/observers/index.js';
import { badRequest, unauthorized } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const STATUS_MAP = {
  PAYMENT_SUCCESS: { paymentStatus: 'paid', event: 'order.paid' },
  PAYMENT_FAILED: { paymentStatus: 'failed', event: 'order.payment_failed' },
  PAYMENT_EXPIRED: { paymentStatus: 'expired', event: 'order.expired' },
  PAYMENT_CANCELLED: { paymentStatus: 'cancelled', event: 'order.cancelled' }
};

export function normalizeIp(ip) {
  if (!ip) return '';
  return String(ip).split(',')[0].replace(/^::ffff:/, '').trim();
}

export function isAllowedWebhookSource(ip, config = env) {
  if (config.NODE_ENV !== 'production') return true;
  const allowlist = String(config.MAYA_WEBHOOK_IP_ALLOWLIST || '')
    .split(',')
    .map(normalizeIp)
    .filter(Boolean);
  return allowlist.includes(normalizeIp(ip));
}

function resolvePaymentStatus(payload) {
  if (payload.paymentStatus) return payload.paymentStatus;
  if (payload.status === 'COMPLETED') return 'PAYMENT_SUCCESS';
  return '';
}

export async function handleWebhook(rawBody, { ip, config = env } = {}) {
  if (!isAllowedWebhookSource(ip, config)) throw unauthorized('Webhook source is not allowed');

  const raw = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(JSON.stringify(rawBody ?? {}));
  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    throw badRequest('Invalid webhook payload');
  }

  const checkoutId = payload.id;
  if (!checkoutId || typeof checkoutId !== 'string') throw badRequest('Invalid webhook payload');

  const paymentStatus = resolvePaymentStatus(payload);
  const eventId = `${checkoutId}:${paymentStatus || payload.status || 'UNKNOWN'}`;
  const payloadHash = crypto.createHash('sha256').update(raw).digest('hex');

  try {
    await webhookEventRepository.create({ eventId, payloadHash });
  } catch (error) {
    if (error?.code === 11000) return { received: true, duplicate: true };
    throw error;
  }

  const orderId = payload.requestReferenceNumber || payload.metadata?.orderId;
  if (!orderId || !/^[0-9a-fA-F]{24}$/.test(String(orderId))) {
    return { received: true, ignored: 'missing_order_reference' };
  }

  const order = await orderRepository.findById(orderId);
  if (!order) return { received: true, ignored: 'order_not_found' };

  if (order.paymentReference && order.paymentReference !== checkoutId) {
    return { received: true, ignored: 'checkout_mismatch' };
  }

  const amount = payload.totalAmount?.value;
  if (amount != null && Number(amount) !== Number(order.total)) {
    logger.warn('Maya webhook amount mismatch', {
      orderId: String(order._id), expected: order.total, received: amount
    });
    return { received: true, ignored: 'amount_mismatch' };
  }

  const currency = payload.totalAmount?.currency;
  if (currency && currency !== 'PHP') return { received: true, ignored: 'currency_mismatch' };

  const transition = STATUS_MAP[paymentStatus];
  if (!transition) {
    return { received: true, ignored: paymentStatus === 'PAYMENT_PENDING' ? 'pending' : 'unhandled_status' };
  }

  if (transition.paymentStatus === 'paid') {
    if (order.paymentStatus === 'paid') return { received: true, status: 'paid' };
    order.paymentStatus = 'paid';
    order.paymentReference = checkoutId;
    order.paidAt = new Date();
  } else {
    if (order.paymentStatus !== 'pending') return { received: true, status: order.paymentStatus };
    order.paymentStatus = transition.paymentStatus;
  }

  await order.save();
  await orderEvents.emit(transition.event, order);
  return { received: true, status: order.paymentStatus };
}
