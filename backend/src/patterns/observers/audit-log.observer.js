import { orderEvents } from './order-event-bus.js';
import { logger } from '../../utils/logger.js';

const AUDITED_EVENTS = [
  'order.paid',
  'order.cancelled',
  'order.payment_failed',
  'order.expired',
  'order.status_changed'
];

for (const event of AUDITED_EVENTS) {
  orderEvents.on(event, (order) => {
    logger.info('Order event', {
      event,
      orderId: order._id?.toString(),
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus
    });
  });
}
