import {
  assertNoSecretInMessage,
  redactSecrets,
} from './credential-protection';

describe('credential protection', () => {
  it('redacts secret-like object keys', () => {
    expect(
      redactSecrets({
        provider: 'deepseek',
        apiKey: 'sk-live-should-not-leak',
        nested: { access_token: 'tok_abc', ok: true },
      }),
    ).toEqual({
      provider: 'deepseek',
      apiKey: '[REDACTED]',
      nested: { access_token: '[REDACTED]', ok: true },
    });
  });

  it('redacts bearer headers', () => {
    expect(redactSecrets('Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig')).toBe(
      'Bearer [REDACTED]',
    );
  });

  it('rejects messages that embed raw secrets', () => {
    expect(() =>
      assertNoSecretInMessage('failed with sk-secret-value', [
        'sk-secret-value',
      ]),
    ).toThrow('Provider message must not include raw credentials.');
  });
});
