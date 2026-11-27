import { env } from '../config/env.js';
import { createPaymentProvider } from '../patterns/payment/payment-provider.factory.js';

export function createCheckout(order) {
  return createPaymentProvider(env).createCheckout(order);
}
