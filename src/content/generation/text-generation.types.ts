export const CONTENT_PROMPT_VERSION = 'content-v1';

export const TEXT_GENERATION_PROVIDER = Symbol('TEXT_GENERATION_PROVIDER');

export type BrandContext = {
  name: string;
  tone: string | null;
  approvedFacts: string | null;
  prohibitedClaims: string | null;
};

export type TextGenerationInput = {
  topic: string;
  audience?: string;
  format?: string;
  brand?: BrandContext | null;
  workspaceId: string;
  contentRequestId: string;
};

export type TextGenerationUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type TextGenerationResult = {
  provider: string;
  promptVersion: string;
  title: string;
  body: string;
  usage?: TextGenerationUsage;
  metadata?: Record<string, unknown>;
};

export type SafeGenerationError = {
  code: string;
  message: string;
};

export class GenerationProviderError extends Error {
  readonly code: string;
  readonly safeMessage: string;

  constructor(code: string, safeMessage: string, cause?: unknown) {
    super(safeMessage);
    this.name = 'GenerationProviderError';
    this.code = code;
    this.safeMessage = safeMessage;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }

  toSafeError(): SafeGenerationError {
    return { code: this.code, message: this.safeMessage };
  }
}

export interface TextGenerationProvider {
  readonly name: string;
  generate(input: TextGenerationInput): Promise<TextGenerationResult>;
}
