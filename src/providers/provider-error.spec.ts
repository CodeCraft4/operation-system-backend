import { ProviderError } from './provider-error';

describe('ProviderError', () => {
  it('normalizes not-configured failures', () => {
    const error = ProviderError.notConfigured('deepseek');

    expect(error.code).toBe('not_configured');
    expect(error.provider).toBe('deepseek');
    expect(error.statusHint).toBe(503);
    expect(error.toSafeJSON()).toEqual({
      name: 'ProviderError',
      code: 'not_configured',
      provider: 'deepseek',
      message: 'deepseek is not configured.',
      statusHint: 503,
    });
  });

  it('builds timeout and expired-token codes', () => {
    expect(ProviderError.timeout('retell', 5000).code).toBe('timeout');
    expect(ProviderError.expiredToken('social').code).toBe('expired_token');
    expect(ProviderError.revoked('meta_ads').code).toBe('revoked');
    expect(ProviderError.missingPermissions('google_ads', 'ads.readonly').code).toBe(
      'missing_permissions',
    );
  });
});
