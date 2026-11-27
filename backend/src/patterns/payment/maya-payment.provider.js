import { PaymentProvider } from './payment-provider.js';
import { AppError, serviceUnavailable } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

const CHECKOUT_PATH = '/checkout/v1/checkouts';

export class MayaPaymentProvider extends PaymentProvider {
  constructor(config = {}) {
    super();
    this.publicKey = config.MAYA_PUBLIC_KEY || '';
    this.baseUrl = (config.MAYA_API_BASE_URL || 'https://pg-sandbox.paymaya.com').replace(/\/+$/, '');
    this.timeoutMs = Number(config.MAYA_HTTP_TIMEOUT_MS || 10000);
    this.redirectUrls = {
      success: config.MAYA_REDIRECT_URL_SUCCESS || '',
      failure: config.MAYA_REDIRECT_URL_FAILURE || '',
      cancel: config.MAYA_REDIRECT_URL_CANCEL || ''
    };
  }

  authorizationHeader() {
    return `Basic ${Buffer.from(`${this.publicKey}:`).toString('base64')}`;
  }

  buildCheckoutPayload(order) {
    const payload = {
      totalAmount: { value: Number(order.total), currency: 'PHP' },
      requestReferenceNumber: String(order._id),
      items: order.items.map((item) => ({
        name: item.name,
        quantity: String(item.quantity),
        amount: { value: Number(item.price) },
        totalAmount: { value: Number(item.price) * item.quantity }
      })),
      metadata: { orderId: String(order._id) }
    };

    const redirectUrl = Object.fromEntries(
      Object.entries(this.redirectUrls).filter(([, url]) => Boolean(url))
    );
    if (Object.keys(redirectUrl).length > 0) payload.redirectUrl = redirectUrl;
    return payload;
  }

  async createCheckout(order) {
    if (!this.publicKey) throw serviceUnavailable('Maya Checkout is not configured.');

    let response;
    try {
      response = await fetch(`${this.baseUrl}${CHECKOUT_PATH}`, {
        method: 'POST',
        headers: {
          Authorization: this.authorizationHeader(),
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(this.buildCheckoutPayload(order)),
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      logger.warn('Maya checkout request failed', { message: error.message });
      throw new AppError(502, 'Maya Checkout is unavailable. Please try again.');
    }

    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.checkoutId || !body.redirectUrl) {
      logger.warn('Maya checkout rejected', { status: response.status, error: body.error || body.message });
      throw new AppError(502, 'Maya Checkout could not create a payment session.');
    }

    return {
      provider: 'maya',
      checkoutUrl: body.redirectUrl,
      reference: body.checkoutId
    };
  }
}
