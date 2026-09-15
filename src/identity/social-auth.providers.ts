/** Supabase Auth social login providers supported by this API. */
export const SUPABASE_SOCIAL_AUTH_PROVIDERS = ['google', 'facebook'] as const;

export type SupabaseSocialAuthProvider =
  (typeof SUPABASE_SOCIAL_AUTH_PROVIDERS)[number];

export function isSupabaseSocialAuthProvider(
  value: string,
): value is SupabaseSocialAuthProvider {
  return (SUPABASE_SOCIAL_AUTH_PROVIDERS as readonly string[]).includes(value);
}
