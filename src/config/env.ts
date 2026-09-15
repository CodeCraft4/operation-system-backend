import { z } from 'zod';

function emptyToUndefined(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return value;
}

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('api/v1'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  DIRECT_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_ANON_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_PUBLISHABLE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().optional(),
  ),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().optional(),
  ),
  INNGEST_EVENT_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  INNGEST_SIGNING_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  CONTENT_GENERATION_PROVIDER: z.preprocess(
    emptyToUndefined,
    z.enum(['stub', 'deepseek']).optional(),
  ),
  DEEPSEEK_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  DEEPSEEK_BASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  DEEPSEEK_MODEL: z.preprocess(emptyToUndefined, z.string().optional()),
  DEEPSEEK_TIMEOUT_MS: z.preprocess((value) => {
    const normalized = emptyToUndefined(value);
    if (normalized === undefined) {
      return undefined;
    }
    return Number(normalized);
  }, z.number().int().positive().optional()),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return parsed.data;
}
