import { describe, expect, it } from 'vitest';
import { createPaymentProvider } from '../../src/patterns/payment/payment-provider.factory.js';
import { MayaPaymentProvider } from '../../src/patterns/payment/maya-payment.provider.js';
import { SandboxPaymentProvider } from '../../src/patterns/payment/sandbox-payment.provider.js';

describe('payment provider factory', () => {
  it('defaults to the sandbox provider without a Maya key', async () => {
    const provider = createPaymentProvider({ NODE_ENV: 'development' });
    expect(provider).toBeInstanceOf(SandboxPaymentProvider);
    await expect(provider.createCheckout({ _id: 'abc123' })).resolves.toMatchObject({
      provider: 'sandbox',
      checkoutUrl: null,
      reference: 'TEST-abc123'
    });
  });

  it('selects Maya when a public key is configured', () => {
    const provider = createPaymentProvider({
      NODE_ENV: 'development',
      MAYA_PUBLIC_KEY: 'pk_test'
    });
    expect(provider).toBeInstanceOf(MayaPaymentProvider);
  });

  it('forces the sandbox provider in the test environment', () => {
    const provider = createPaymentProvider({
      NODE_ENV: 'test',
      MAYA_PUBLIC_KEY: 'pk_test'
    });
    expect(provider).toBeInstanceOf(SandboxPaymentProvider);
  });
});
