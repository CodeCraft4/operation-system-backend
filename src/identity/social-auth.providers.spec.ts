import {
  isSupabaseSocialAuthProvider,
  SUPABASE_SOCIAL_AUTH_PROVIDERS,
} from './social-auth.providers';

describe('social auth providers', () => {
  it('supports google and facebook only', () => {
    expect(SUPABASE_SOCIAL_AUTH_PROVIDERS).toEqual(['google', 'facebook']);
    expect(isSupabaseSocialAuthProvider('google')).toBe(true);
    expect(isSupabaseSocialAuthProvider('facebook')).toBe(true);
    expect(isSupabaseSocialAuthProvider('linkedin')).toBe(false);
  });
});
