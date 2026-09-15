import type { IntegrationStatus } from '../common/integration-status';
import type { ProviderHealth, ProviderKind } from './provider.types';

/**
 * Minimum contract every external provider adapter must satisfy.
 * Soft-connect: unconfigured adapters return IntegrationStatus 'skipped'.
 */
export interface ProviderAdapter {
  readonly kind: ProviderKind;

  /** Probe connectivity / credentials without throwing. */
  check(): Promise<IntegrationStatus>;

  /** Structured health payload for connection-health endpoints. */
  health(): Promise<ProviderHealth>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
export const SOCIAL_OAUTH_PROVIDER = Symbol('SOCIAL_OAUTH_PROVIDER');
export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
export const VOICE_PROVIDER = Symbol('VOICE_PROVIDER');
export const ADS_PROVIDER = Symbol('ADS_PROVIDER');
