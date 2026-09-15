import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  isUsableSecret,
  type IntegrationStatus,
} from '../../common/integration-status';
import type { Env } from '../../config/env';
import type { AiGenerateInput, AiGenerateResult, AiProvider } from '../ai-provider';
import { fetchWithTimeout } from '../fetch-with-timeout';
import { ProviderError } from '../provider-error';
import type { ProviderHealth } from '../provider.types';

type DeepSeekChatResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

@Injectable()
export class DeepSeekAiProvider implements AiProvider {
  readonly kind = 'deepseek' as const;
  private readonly logger = new Logger(DeepSeekAiProvider.name);
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultTimeoutMs: number;
  private readonly configured: boolean;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.apiKey = this.config.get('DEEPSEEK_API_KEY', { infer: true });
    this.baseUrl = (
      this.config.get('DEEPSEEK_BASE_URL', { infer: true }) ??
      'https://api.deepseek.com'
    ).replace(/\/$/, '');
    this.defaultModel =
      this.config.get('DEEPSEEK_MODEL', { infer: true }) ?? 'deepseek-chat';
    this.defaultTimeoutMs =
      this.config.get('DEEPSEEK_TIMEOUT_MS', { infer: true }) ?? 30_000;
    this.configured = isUsableSecret(this.apiKey);

    if (this.configured) {
      this.logger.log('DeepSeek client is configured.');
    } else {
      this.logger.log('DeepSeek is idle. Add DEEPSEEK_API_KEY to connect.');
    }
  }

  async check(): Promise<IntegrationStatus> {
    if (!this.configured || !this.apiKey) {
      return 'skipped';
    }

    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/models`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
        this.defaultTimeoutMs,
        this.kind,
      );
      return response.ok ? 'ok' : 'error';
    } catch {
      return 'error';
    }
  }

  async health(): Promise<ProviderHealth> {
    const status = await this.check();
    return {
      provider: this.kind,
      status,
      checkedAt: new Date().toISOString(),
      message:
        status === 'skipped'
          ? 'DEEPSEEK_API_KEY is not configured.'
          : status === 'ok'
            ? 'DeepSeek API is reachable.'
            : 'DeepSeek health check failed.',
    };
  }

  async generate<T = unknown>(
    input: AiGenerateInput,
  ): Promise<AiGenerateResult<T>> {
    if (!this.configured || !this.apiKey) {
      throw ProviderError.notConfigured(this.kind);
    }

    const timeoutMs = input.timeoutMs ?? this.defaultTimeoutMs;
    const model = input.model ?? this.defaultModel;
    const messages = [
      ...(input.system ? [{ role: 'system', content: input.system }] : []),
      { role: 'user', content: input.prompt },
    ];

    const body: Record<string, unknown> = {
      model,
      messages,
    };
    if (input.structured) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      timeoutMs,
      this.kind,
    );

    const payload = (await response.json()) as DeepSeekChatResponse;
    if (!response.ok) {
      throw new ProviderError({
        code: 'provider_error',
        provider: this.kind,
        message: payload.error?.message ?? 'DeepSeek request failed.',
        statusHint: response.status,
      });
    }

    const text = payload.choices?.[0]?.message?.content?.trim() ?? '';
    if (!text) {
      throw new ProviderError({
        code: 'invalid_response',
        provider: this.kind,
        message: 'DeepSeek returned an empty response.',
        statusHint: 502,
      });
    }

    let data: T | undefined;
    if (input.structured) {
      try {
        data = JSON.parse(text) as T;
      } catch (error) {
        throw new ProviderError({
          code: 'invalid_response',
          provider: this.kind,
          message: 'DeepSeek structured response was not valid JSON.',
          cause: error,
          statusHint: 502,
        });
      }
    }

    return {
      text,
      data,
      model: payload.model ?? model,
      usage: {
        provider: this.kind,
        model: payload.model ?? model,
        inputTokens: payload.usage?.prompt_tokens,
        outputTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
        requestId: payload.id,
      },
      rawProviderRequestId: payload.id,
    };
  }
}
