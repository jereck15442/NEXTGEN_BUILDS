import { orderEvents } from './order-event-bus.js';
import { releaseReservation } from '../../services/inventory.service.js';

const RELEASE_EVENTS = ['order.cancelled', 'order.payment_failed', 'order.expired'];

for (const event of RELEASE_EVENTS) {
  orderEvents.on(event, (order) => releaseReservation(order));
}
