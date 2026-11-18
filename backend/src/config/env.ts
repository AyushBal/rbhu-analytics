import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  AUTH_MODE: z.enum(['mock', 'entra']).default('mock'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ENTRA_TENANT_ID: z.string().optional().default(''),
  ENTRA_AUDIENCE: z.string().optional().default(''),

  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  AZURE_OPENAI_ENDPOINT: z.string().optional().default(''),
  AZURE_OPENAI_API_KEY: z.string().optional().default(''),
  AZURE_OPENAI_DEPLOYMENT: z.string().optional().default(''),
  AZURE_OPENAI_API_VERSION: z.string().default('2024-06-01'),

  ANALYTICS_URL: z.string().default('http://localhost:5001'),
  REDIS_URL: z.string().optional().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast with a readable message instead of crashing later on an undefined value.
  console.error('Invalid environment configuration:\n', JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
export const isProd = env.NODE_ENV === 'production';
