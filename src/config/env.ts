import { z } from 'zod';

function emptyToUndefined(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return value;
}

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }
  return value;
}, z.boolean().optional());

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('api/v1'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: optionalString,
  DIRECT_URL: optionalString,
  SUPABASE_URL: optionalString,
  SUPABASE_ANON_KEY: optionalString,
  SUPABASE_PUBLISHABLE_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  /** Frontend URL Supabase redirects to after Google/Facebook OAuth. */
  SUPABASE_OAUTH_REDIRECT_URL: optionalString,
  INNGEST_EVENT_KEY: optionalString,
  INNGEST_SIGNING_KEY: optionalString,

  DEEPSEEK_API_KEY: optionalString,
  DEEPSEEK_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().default('https://api.deepseek.com'),
  ),
  DEEPSEEK_MODEL: z.preprocess(
    emptyToUndefined,
    z.string().default('deepseek-chat'),
  ),
  DEEPSEEK_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  RETELL_API_KEY: optionalString,
  RETELL_AGENT_ID: optionalString,
  RETELL_WEBHOOK_URL: optionalString,
  RETELL_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().default('https://api.retellai.com'),
  ),
  RETELL_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),

  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_SECURE: optionalBoolean,
  SMTP_FROM: optionalString,

  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  FACEBOOK_CLIENT_ID: optionalString,
  FACEBOOK_CLIENT_SECRET: optionalString,
  FACEBOOK_CALLBACK_URL: optionalString,

  /** 32+ char secret used to encrypt provider OAuth tokens at rest. */
  PROVIDER_TOKEN_ENCRYPTION_KEY: optionalString,
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return parsed.data;
}
