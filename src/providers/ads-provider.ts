import type { ProviderAdapter } from './provider-adapter';
import type { AdsPlatform, ConnectionHealth } from './provider.types';

export type AdsAccessCheckInput = {
  workspaceId: string;
  platform: AdsPlatform;
  /** Workspace-scoped connection id once persistence exists. */
  connectionId?: string;
  /** External ads account / customer id when already known. */
  externalAccountId?: string;
};

export type AdsAccessRegisterEntry = {
  platform: AdsPlatform;
  connectionId?: string;
  externalAccountId?: string;
  canRead: boolean;
  checkedAt: string;
  missingPermissions?: string[];
  message?: string;
};

/**
 * Google / Meta advertising read-access validation.
 * Failures must be safe (no credential leakage).
 */
export interface AdsProvider extends ProviderAdapter {
  validateReadAccess(
    input: AdsAccessCheckInput,
  ): Promise<AdsAccessRegisterEntry>;

  /** Maintain an in-memory or persisted register of access checks. */
  getAccessRegister(workspaceId: string): Promise<AdsAccessRegisterEntry[]>;

  checkConnection(connectionId: string): Promise<ConnectionHealth>;
}
