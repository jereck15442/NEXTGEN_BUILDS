import 'dotenv/config';
import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).optional(),
  JWT_SECRET: isProduction
    ? z.string().min(32, 'JWT_SECRET must be at least 32 characters in production')
    : z.string().min(1).default('development-secret'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.5-flash'),
  MAYA_PUBLIC_KEY: z.string().optional().default(''),
  MAYA_SECRET_KEY: z.string().optional().default(''),
  MAYA_API_BASE_URL: z.string().url().default('https://pg-sandbox.paymaya.com'),
  MAYA_REDIRECT_URL_SUCCESS: z.string().url().default('http://localhost:4000/api/v1/payments/return/success'),
  MAYA_REDIRECT_URL_FAILURE: z.string().url().default('http://localhost:4000/api/v1/payments/return/failure'),
  MAYA_REDIRECT_URL_CANCEL: z.string().url().default('http://localhost:4000/api/v1/payments/return/cancel'),
  MAYA_WEBHOOK_IP_ALLOWLIST: z.string().default('13.229.160.234,3.1.199.75'),
  MAYA_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  TRUST_PROXY: z.enum(['true', 'false']).default('false')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('; ');
  console.error(`Invalid environment configuration: ${details}`);
  process.exit(1);
}

if (isProduction && !parsed.data.MONGODB_URI) {
  console.error('Invalid environment configuration: MONGODB_URI is required in production');
  process.exit(1);
}

if (isProduction && !parsed.data.MAYA_PUBLIC_KEY) {
  console.error('Invalid environment configuration: MAYA_PUBLIC_KEY is required in production');
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export const isProductionEnv = env.NODE_ENV === 'production';
