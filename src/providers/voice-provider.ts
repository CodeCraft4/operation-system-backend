import type { ProviderAdapter } from './provider-adapter';
import type { ProviderHealth } from './provider.types';

/**
 * Voice/telephony adapter (Retell first).
 * This sprint focuses on account-health checks, not call orchestration.
 */
export interface VoiceProvider extends ProviderAdapter {
  checkAccountHealth(): Promise<ProviderHealth>;
}
