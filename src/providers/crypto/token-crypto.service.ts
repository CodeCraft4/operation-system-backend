import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { isUsableSecret } from '../../common/integration-status';
import type { Env } from '../../config/env';
import { ProviderError } from '../provider-error';

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts provider OAuth tokens at rest.
 * Ciphertext format: base64(iv).base64(tag).base64(ciphertext)
 */
@Injectable()
export class TokenCryptoService {
  private readonly logger = new Logger(TokenCryptoService.name);
  private readonly key: Buffer | null;

  constructor(private readonly config: ConfigService<Env, true>) {
    const secret = this.config.get('PROVIDER_TOKEN_ENCRYPTION_KEY', {
      infer: true,
    });
    if (isUsableSecret(secret)) {
      this.key = createHash('sha256').update(secret!).digest();
      this.logger.log('Provider token encryption is configured.');
    } else {
      this.key = null;
      this.logger.log(
        'Provider token encryption is idle. Add PROVIDER_TOKEN_ENCRYPTION_KEY.',
      );
    }
  }

  get isConfigured() {
    return this.key !== null;
  }

  encrypt(plaintext: string): string {
    if (!this.key) {
      throw ProviderError.notConfigured('token_crypto');
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
  }

  decrypt(payload: string): string {
    if (!this.key) {
      throw ProviderError.notConfigured('token_crypto');
    }

    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new ProviderError({
        code: 'invalid_response',
        provider: 'token_crypto',
        message: 'Encrypted token payload is invalid.',
        statusHint: 500,
      });
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
