import { ConfigService } from '@nestjs/config';

import { TokenCryptoService } from './token-crypto.service';

describe('TokenCryptoService', () => {
  it('encrypts and decrypts provider tokens', () => {
    const config = {
      get: () => 'test-provider-token-encryption-key-32chars',
    };
    const crypto = new TokenCryptoService(config as unknown as ConfigService);

    expect(crypto.isConfigured).toBe(true);
    const encrypted = crypto.encrypt('access-token-value');
    expect(encrypted).not.toContain('access-token-value');
    expect(crypto.decrypt(encrypted)).toBe('access-token-value');
  });

  it('is idle without encryption key', () => {
    const config = { get: () => undefined };
    const crypto = new TokenCryptoService(config as unknown as ConfigService);
    expect(crypto.isConfigured).toBe(false);
  });
});
