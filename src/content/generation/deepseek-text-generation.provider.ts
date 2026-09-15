import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env';
import {
  CONTENT_PROMPT_VERSION,
  GenerationProviderError,
  type TextGenerationInput,
  type TextGenerationProvider,
  type TextGenerationResult,
  type TextGenerationUsage,
} from './text-generation.types';

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
};

@Injectable()
export class DeepSeekTextGenerationProvider implements TextGenerationProvider {
  readonly name = 'deepseek';

  constructor(private readonly config: ConfigService<Env, true>) {}

  async generate(input: TextGenerationInput): Promise<TextGenerationResult> {
    const apiKey = this.config.get('DEEPSEEK_API_KEY', { infer: true });
    if (!apiKey) {
      throw new GenerationProviderError(
        'provider_not_configured',
        'DeepSeek is not configured. Set DEEPSEEK_API_KEY or use the stub provider.',
      );
    }

    const baseUrl =
      this.config.get('DEEPSEEK_BASE_URL', { infer: true }) ??
      'https://api.deepseek.com';
    const model =
      this.config.get('DEEPSEEK_MODEL', { infer: true }) ?? 'deepseek-chat';
    const timeoutMs =
      this.config.get('DEEPSEEK_TIMEOUT_MS', { infer: true }) ?? 30_000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0.4,
            messages: [
              {
                role: 'system',
                content:
                  'You are a marketing content assistant. Return plain text only. Start with a short title line, then the body.',
              },
              {
                role: 'user',
                content: this.buildPrompt(input),
              },
            ],
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new GenerationProviderError(
          'provider_http_error',
          `DeepSeek request failed with status ${response.status}.`,
        );
      }

      const payload = (await response.json()) as DeepSeekChatResponse;
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new GenerationProviderError(
          'provider_invalid_response',
          'DeepSeek returned an empty or invalid response.',
        );
      }

      const [firstLine, ...rest] = content.split('\n');
      const title = (firstLine || `Draft: ${input.topic}`).slice(0, 200);
      const body = rest.join('\n').trim() || content;

      return {
        provider: this.name,
        promptVersion: CONTENT_PROMPT_VERSION,
        title,
        body,
        usage: this.mapUsage(payload.usage),
        metadata: {
          model: payload.model ?? model,
        },
      };
    } catch (error) {
      if (error instanceof GenerationProviderError) {
        throw error;
      }
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('aborted'))
      ) {
        throw new GenerationProviderError(
          'provider_timeout',
          'DeepSeek request timed out.',
          error,
        );
      }
      throw new GenerationProviderError(
        'provider_request_failed',
        'DeepSeek request failed.',
        error,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private buildPrompt(input: TextGenerationInput) {
    const lines = [
      `Topic: ${input.topic}`,
      input.audience ? `Audience: ${input.audience}` : null,
      input.format ? `Format: ${input.format}` : null,
      input.brand
        ? [
            `Brand: ${input.brand.name}`,
            input.brand.tone ? `Tone: ${input.brand.tone}` : null,
            input.brand.approvedFacts
              ? `Approved facts: ${input.brand.approvedFacts}`
              : null,
            input.brand.prohibitedClaims
              ? `Prohibited claims: ${input.brand.prohibitedClaims}`
              : null,
          ]
            .filter(Boolean)
            .join('\n')
        : 'Brand: none',
    ];
    return lines.filter(Boolean).join('\n');
  }

  private mapUsage(
    usage?: DeepSeekChatResponse['usage'],
  ): TextGenerationUsage | undefined {
    if (!usage) {
      return undefined;
    }
    return {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    };
  }
}
