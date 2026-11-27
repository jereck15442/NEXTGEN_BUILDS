import { PaymentProvider } from './payment-provider.js';

export class SandboxPaymentProvider extends PaymentProvider {
  async createCheckout(order) {
    return {
      provider: 'sandbox',
      checkoutUrl: null,
      reference: `TEST-${order._id}`,
      message: 'Maya Checkout is not configured. Set MAYA_PUBLIC_KEY to create real sandbox checkouts.'
    };
  }
}
