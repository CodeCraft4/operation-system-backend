import { ConfigService } from '@nestjs/config';

import { SmtpEmailProvider } from './smtp-email.provider';

describe('SmtpEmailProvider', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        SMTP_HOST: undefined,
        SMTP_PORT: 587,
        SMTP_USER: undefined,
        SMTP_PASSWORD: undefined,
        SMTP_SECURE: false,
        SMTP_FROM: undefined,
      };
      return values[key];
    }),
  };

  it('returns skipped when SMTP is not configured', async () => {
    const provider = new SmtpEmailProvider(config as unknown as ConfigService);

    await expect(provider.check()).resolves.toBe('skipped');
    await expect(provider.health()).resolves.toMatchObject({
      provider: 'email',
      status: 'skipped',
    });
  });
});
