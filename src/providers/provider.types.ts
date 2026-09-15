import type { IntegrationStatus } from '../common/integration-status';

/** External SaaS providers this backend will adapt to. */
export type ProviderKind =
  | 'deepseek'
  | 'retell'
  | 'email'
  | 'google_ads'
  | 'meta_ads'
  | 'social';

/** First four social account types for OAuth connections. */
export type SocialAccountType =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'x';

/** Advertising platforms that need read-access validation. */
export type AdsPlatform = 'google' | 'meta';

/** Lifecycle of a stored provider connection (not HTTP IntegrationStatus). */
export type ConnectionLifecycleStatus =
  | 'pending'
  | 'connected'
  | 'disconnected'
  | 'expired'
  | 'error';

export type ProviderHealth = {
  provider: ProviderKind;
  status: IntegrationStatus;
  checkedAt: string;
  message?: string;
};

export type ConnectionHealth = {
  connectionId: string;
  provider: ProviderKind;
  status: ConnectionLifecycleStatus;
  checkedAt: string;
  scopes?: string[];
  externalAccountId?: string;
  message?: string;
};

export type ProviderUsage = {
  provider: ProviderKind;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  requestId?: string;
};

export type ProviderTimeoutOptions = {
  /** Milliseconds before the adapter aborts the outbound call. */
  timeoutMs: number;
};
