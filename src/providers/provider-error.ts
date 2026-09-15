export type ProviderErrorCode =
  | 'not_configured'
  | 'missing_permissions'
  | 'revoked'
  | 'expired_token'
  | 'timeout'
  | 'provider_error'
  | 'invalid_response';

export type ProviderErrorOptions = {
  code: ProviderErrorCode;
  message: string;
  provider?: string;
  cause?: unknown;
  /** HTTP-ish status when mapping to Nest exceptions later. */
  statusHint?: number;
};

/**
 * Normalized provider failure. Adapters throw this (or map to it)
 * so callers never depend on raw SDK/HTTP error shapes.
 */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly provider?: string;
  readonly statusHint?: number;
  readonly cause?: unknown;

  constructor(options: ProviderErrorOptions) {
    super(options.message);
    this.name = 'ProviderError';
    this.code = options.code;
    this.provider = options.provider;
    this.statusHint = options.statusHint;
    this.cause = options.cause;
  }

  static notConfigured(provider: string) {
    return new ProviderError({
      code: 'not_configured',
      provider,
      message: `${provider} is not configured.`,
      statusHint: 503,
    });
  }

  static timeout(provider: string, timeoutMs: number) {
    return new ProviderError({
      code: 'timeout',
      provider,
      message: `${provider} timed out after ${timeoutMs}ms.`,
      statusHint: 504,
    });
  }

  static expiredToken(provider: string) {
    return new ProviderError({
      code: 'expired_token',
      provider,
      message: `${provider} access token has expired.`,
      statusHint: 401,
    });
  }

  static revoked(provider: string) {
    return new ProviderError({
      code: 'revoked',
      provider,
      message: `${provider} access was revoked.`,
      statusHint: 401,
    });
  }

  static missingPermissions(provider: string, detail?: string) {
    return new ProviderError({
      code: 'missing_permissions',
      provider,
      message: detail
        ? `${provider} is missing required permissions: ${detail}`
        : `${provider} is missing required permissions.`,
      statusHint: 403,
    });
  }

  toSafeJSON() {
    return {
      name: this.name,
      code: this.code,
      provider: this.provider,
      message: this.message,
      statusHint: this.statusHint,
    };
  }
}
