import type { ProviderAdapter } from './provider-adapter';
import type {
  ConnectionHealth,
  ConnectionLifecycleStatus,
  SocialAccountType,
} from './provider.types';

export type OAuthStartInput = {
  workspaceId: string;
  accountType: SocialAccountType;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

export type OAuthAuthorizationUrl = {
  url: string;
  state: string;
  accountType: SocialAccountType;
};

export type OAuthCallbackInput = {
  workspaceId: string;
  accountType: SocialAccountType;
  code: string;
  state: string;
  redirectUri: string;
};

export type ProviderConnectionResult = {
  connectionId: string;
  accountType: SocialAccountType;
  status: ConnectionLifecycleStatus;
  externalAccountId?: string;
  scopes?: string[];
};

/**
 * Social OAuth adapter contract.
 * Stubs: start URL, callback exchange, health, disconnect/reconnect/expired.
 */
export interface SocialOAuthProvider extends ProviderAdapter {
  getAuthorizationUrl(input: OAuthStartInput): Promise<OAuthAuthorizationUrl>;

  handleCallback(
    input: OAuthCallbackInput,
  ): Promise<ProviderConnectionResult>;

  checkConnection(connectionId: string): Promise<ConnectionHealth>;

  disconnect(connectionId: string): Promise<ProviderConnectionResult>;

  /** Returns a fresh authorization URL to re-link an existing connection. */
  reconnect(connectionId: string): Promise<OAuthAuthorizationUrl>;

  /**
   * Refresh when expired; if refresh is impossible, return status 'expired'
   * (do not expose tokens).
   */
  handleExpiredToken(connectionId: string): Promise<ConnectionHealth>;
}
