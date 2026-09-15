import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import {
  CONTENT_PROMPT_VERSION,
  type TextGenerationInput,
  type TextGenerationProvider,
  type TextGenerationResult,
} from './text-generation.types';

@Injectable()
export class StubTextGenerationProvider implements TextGenerationProvider {
  readonly name = 'stub';

  generate(input: TextGenerationInput): Promise<TextGenerationResult> {
    const fingerprint = createHash('sha256')
      .update(
        [
          input.workspaceId,
          input.contentRequestId,
          input.topic,
          input.audience ?? '',
          input.format ?? '',
          input.brand?.name ?? '',
        ].join('|'),
      )
      .digest('hex')
      .slice(0, 12);

    const brandLine = input.brand
      ? `Brand: ${input.brand.name}${input.brand.tone ? ` (${input.brand.tone})` : ''}.`
      : 'Brand: none.';

    const title = `Draft: ${input.topic}`;
    const body = [
      title,
      brandLine,
      input.audience ? `Audience: ${input.audience}.` : null,
      input.format ? `Format: ${input.format}.` : null,
      `Stub content for request ${input.contentRequestId} [${fingerprint}].`,
      'This deterministic draft is produced by StubTextGenerationProvider for local and test runs.',
    ]
      .filter(Boolean)
      .join('\n');

    return Promise.resolve({
      provider: this.name,
      promptVersion: CONTENT_PROMPT_VERSION,
      title,
      body,
      usage: {
        promptTokens: 32,
        completionTokens: 64,
        totalTokens: 96,
      },
      metadata: {
        mode: 'stub',
        fingerprint,
      },
    });
  }
}
