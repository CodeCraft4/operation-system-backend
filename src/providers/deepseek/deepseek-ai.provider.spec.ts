import { ConfigService } from '@nestjs/config';

import { DeepSeekAiProvider } from './deepseek-ai.provider';

describe('DeepSeekAiProvider', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        DEEPSEEK_API_KEY: undefined,
        DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
        DEEPSEEK_MODEL: 'deepseek-chat',
        DEEPSEEK_TIMEOUT_MS: 1000,
      };
      return values[key];
    }),
  };

  it('returns skipped when API key is missing', async () => {
    const provider = new DeepSeekAiProvider(
      config as unknown as ConfigService,
    );

    await expect(provider.check()).resolves.toBe('skipped');
    await expect(provider.health()).resolves.toMatchObject({
      provider: 'deepseek',
      status: 'skipped',
    });
  });
});
