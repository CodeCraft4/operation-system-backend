/**
 * Shared contracts for interchangeable external provider adapters.
 * Concrete DeepSeek / social / email / Retell / ads adapters implement these later.
 */

export * from './provider.types';
export * from './provider-error';
export * from './credential-protection';
export * from './provider-adapter';
export * from './ai-provider';
export * from './social-oauth-provider';
export * from './email-provider';
export * from './voice-provider';
export * from './ads-provider';
export * from './fetch-with-timeout';
export * from './crypto/token-crypto.service';
export * from './deepseek/deepseek-ai.provider';
export * from './retell/retell-voice.provider';
export * from './smtp/smtp-email.provider';
export * from './social/stub-social-oauth.provider';
export * from './ads/stub-ads.provider';
