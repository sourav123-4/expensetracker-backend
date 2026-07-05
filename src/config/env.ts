import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('*'),

  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/expenseflow'),

  JWT_ACCESS_SECRET: z.string().default('dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-change-me'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),

  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),

  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('ExpenseFlow <no-reply@expenseflow.app>'),

  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(5),

  // JSON string of a Firebase service-account credential object; empty disables push notifications
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().default(''),
  // Path to a Firebase service-account JSON; empty disables push notifications
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().default(''),

  // The Google Sign-In "Web client" OAuth ID (from Firebase Console → Authentication →
  // Sign-in method → Google, or Google Cloud Console → Credentials). This is the audience
  // every platform's ID token is issued for when the client configures GoogleSignin with
  // this same ID as `webClientId` — empty disables the /auth/google endpoint.
  GOOGLE_WEB_CLIENT_ID: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
