import { ConfigService } from '@nestjs/config';

import { DeepSeekTextGenerationProvider } from './deepseek-text-generation.provider';
import { StubTextGenerationProvider } from './stub-text-generation.provider';
import { GenerationProviderError } from './text-generation.types';

describe('StubTextGenerationProvider', () => {
  it('returns deterministic structured content', async () => {
    const provider = new StubTextGenerationProvider();
    const input = {
      topic: 'Launch post',
      audience: 'founders',
      format: 'linkedin',
      workspaceId: 'ws_1',
      contentRequestId: 'req_1',
      brand: null,
    };

    const first = await provider.generate(input);
    const second = await provider.generate(input);

    expect(first.provider).toBe('stub');
    expect(first.promptVersion).toBe('content-v1');
    expect(first.title).toContain('Launch post');
    expect(first.body).toContain('req_1');
    expect(first.usage?.totalTokens).toBe(96);
    expect(second.body).toBe(first.body);
    expect(second.metadata).toEqual(first.metadata);
  });
});

describe('DeepSeekTextGenerationProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('normalizes timeout errors safely', async () => {
    const config = {
      get: (key: string) => {
        if (key === 'DEEPSEEK_API_KEY') return 'test-key';
        if (key === 'DEEPSEEK_TIMEOUT_MS') return 5;
        return undefined;
      },
    } as unknown as ConfigService;

    global.fetch = jest.fn(
      () =>
        new Promise((_, reject) => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }),
    ) as unknown as typeof fetch;

    const provider = new DeepSeekTextGenerationProvider(config);
    await expect(
      provider.generate({
        topic: 'x',
        workspaceId: 'ws',
        contentRequestId: 'req',
      }),
    ).rejects.toMatchObject({
      code: 'provider_timeout',
      safeMessage: 'DeepSeek request timed out.',
    } satisfies Partial<GenerationProviderError>);
  });

  it('rejects empty provider responses', async () => {
    const config = {
      get: (key: string) => {
        if (key === 'DEEPSEEK_API_KEY') return 'test-key';
        return undefined;
      },
    } as unknown as ConfigService;

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ choices: [{ message: { content: '   ' } }] }),
      }),
    ) as unknown as typeof fetch;

    const provider = new DeepSeekTextGenerationProvider(config);
    await expect(
      provider.generate({
        topic: 'x',
        workspaceId: 'ws',
        contentRequestId: 'req',
      }),
    ).rejects.toMatchObject({
      code: 'provider_invalid_response',
    });
  });
});
