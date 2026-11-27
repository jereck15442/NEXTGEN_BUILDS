import { MayaPaymentProvider } from './maya-payment.provider.js';
import { SandboxPaymentProvider } from './sandbox-payment.provider.js';

export function createPaymentProvider(config = process.env) {
  const nodeEnv = config.NODE_ENV ?? process.env.NODE_ENV;
  if (nodeEnv === 'test') return new SandboxPaymentProvider();
  if (config.MAYA_PUBLIC_KEY) return new MayaPaymentProvider(config);
  return new SandboxPaymentProvider();
}
