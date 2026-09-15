import type { ProviderAdapter } from './provider-adapter';
import type { ProviderTimeoutOptions, ProviderUsage } from './provider.types';

export type AiGenerateInput = {
  prompt: string;
  system?: string;
  model?: string;
  /** When true, adapter must return parseable structured JSON in `data`. */
  structured?: boolean;
  schemaName?: string;
} & Partial<ProviderTimeoutOptions>;

export type AiGenerateResult<T = unknown> = {
  text: string;
  data?: T;
  model: string;
  usage: ProviderUsage;
  rawProviderRequestId?: string;
};

/**
 * Interchangeable AI adapter (DeepSeek first).
 * Implementations must enforce timeouts and return usage metadata.
 */
export interface AiProvider extends ProviderAdapter {
  generate<T = unknown>(input: AiGenerateInput): Promise<AiGenerateResult<T>>;
}
