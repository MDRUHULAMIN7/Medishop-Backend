import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/medishop'),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.string().default('6379').transform((val) => parseInt(val, 10)),
  REDIS_PASSWORD: z.string().optional().default(''),
  JWT_ACCESS_SECRET: z.string().default('medishop_access_secret_key_change_in_production_32chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('medishop_refresh_secret_key_change_in_production_32chars'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ENABLE_DEMO_OTP: z.string().default('true').transform((val) => val === 'true'),
  COURIER_PROVIDER: z.enum(['mock', 'pathao']).default('mock'),
  PATHAO_BASE_URL: z.string().default(''),
  PATHAO_CLIENT_ID: z.string().default(''),
  PATHAO_CLIENT_SECRET: z.string().default(''),
  PATHAO_USERNAME: z.string().default(''),
  PATHAO_PASSWORD: z.string().default(''),
  PATHAO_STORE_ID: z.string().default(''),
  PATHAO_TOKEN_PATH: z.string().default('/oauth/token'),
  PATHAO_QUOTE_PATH: z.string().default('/delivery-fees/quote'),
  PATHAO_SHIPMENT_PATH: z.string().default('/shipments'),
  PATHAO_TRACKING_PATH: z.string().default('/shipments/:trackingNumber'),
  PATHAO_CANCEL_PATH: z.string().default('/shipments/:trackingNumber/cancel'),
  PATHAO_PICKUP_PATH: z.string().default('/pickups'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.string().default('587').transform((val) => parseInt(val, 10)),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('no-reply@medishop.com'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables');
}

export const config = _env.data;
