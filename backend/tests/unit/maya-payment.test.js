import { afterEach, describe, expect, it, vi } from 'vitest';
import { MayaPaymentProvider } from '../../src/patterns/payment/maya-payment.provider.js';

const order = {
  _id: '507f1f77bcf86cd799439011',
  total: 1500,
  items: [
    { name: 'Ryzen 5 7600', price: 1000, quantity: 1 },
    { name: 'DDR5 16GB', price: 250, quantity: 2 }
  ]
};

function provider(overrides = {}) {
  return new MayaPaymentProvider({
    MAYA_PUBLIC_KEY: 'pk-test',
    MAYA_API_BASE_URL: 'https://pg-sandbox.paymaya.com',
    MAYA_REDIRECT_URL_SUCCESS: 'http://localhost:4000/api/v1/payments/return/success',
    MAYA_REDIRECT_URL_FAILURE: 'http://localhost:4000/api/v1/payments/return/failure',
    MAYA_REDIRECT_URL_CANCEL: 'http://localhost:4000/api/v1/payments/return/cancel',
    ...overrides
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Maya Checkout provider', () => {
  it('creates a checkout with Basic auth and the expected payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ checkoutId: 'chk_123', redirectUrl: 'https://paymaya.test/chk_123' })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await provider().createCheckout(order);

    expect(result).toEqual({
      provider: 'maya',
      checkoutUrl: 'https://paymaya.test/chk_123',
      reference: 'chk_123'
    });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://pg-sandbox.paymaya.com/checkout/v1/checkouts');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe(
      `Basic ${Buffer.from('pk-test:').toString('base64')}`
    );

    const body = JSON.parse(options.body);
    expect(body.totalAmount).toEqual({ value: 1500, currency: 'PHP' });
    expect(body.requestReferenceNumber).toBe(order._id);
    expect(body.metadata).toEqual({ orderId: order._id });
    expect(body.items).toHaveLength(2);
    expect(body.items[1]).toMatchObject({
      name: 'DDR5 16GB',
      quantity: '2',
      amount: { value: 250 },
      totalAmount: { value: 500 }
    });
    expect(body.redirectUrl).toEqual({
      success: 'http://localhost:4000/api/v1/payments/return/success',
      failure: 'http://localhost:4000/api/v1/payments/return/failure',
      cancel: 'http://localhost:4000/api/v1/payments/return/cancel'
    });
  });

  it('rejects a checkout response without a checkoutId', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ redirectUrl: 'https://paymaya.test/incomplete' })
    }));

    await expect(provider().createCheckout(order)).rejects.toMatchObject({ status: 502 });
  });

  it('maps gateway errors to 502 without leaking the response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'invalid key sk-should-not-leak' })
    }));

    await expect(provider().createCheckout(order)).rejects.toMatchObject({
      status: 502,
      message: 'Maya Checkout could not create a payment session.'
    });
  });

  it('maps network failures to 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket hang up')));
    await expect(provider().createCheckout(order)).rejects.toMatchObject({ status: 502 });
  });

  it('refuses to call Maya without a public key', async () => {
    await expect(provider({ MAYA_PUBLIC_KEY: '' }).createCheckout(order))
      .rejects.toMatchObject({ status: 503 });
  });
});
