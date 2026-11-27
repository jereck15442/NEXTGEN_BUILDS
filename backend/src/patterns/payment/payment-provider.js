export class PaymentProvider {
  async createCheckout(_order) {
    throw new Error('PaymentProvider.createCheckout must be implemented');
  }
}
