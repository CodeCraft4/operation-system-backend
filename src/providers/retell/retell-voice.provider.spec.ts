import { ConfigService } from '@nestjs/config';

import { RetellVoiceProvider } from './retell-voice.provider';

describe('RetellVoiceProvider', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        RETELL_API_KEY: undefined,
        RETELL_AGENT_ID: undefined,
        RETELL_BASE_URL: 'https://api.retellai.com',
        RETELL_TIMEOUT_MS: 1000,
      };
      return values[key];
    }),
  };

  it('returns skipped when Retell credentials are missing', async () => {
    const provider = new RetellVoiceProvider(
      config as unknown as ConfigService,
    );

    await expect(provider.check()).resolves.toBe('skipped');
    await expect(provider.checkAccountHealth()).resolves.toMatchObject({
      provider: 'retell',
      status: 'skipped',
    });
  });
});
