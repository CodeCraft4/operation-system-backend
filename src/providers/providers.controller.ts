import { Controller, Get } from '@nestjs/common';

import { Public } from '../identity/public.decorator';
import { StubAdsProvider } from './ads/stub-ads.provider';
import { DeepSeekAiProvider } from './deepseek/deepseek-ai.provider';
import { RetellVoiceProvider } from './retell/retell-voice.provider';
import { StubSocialOAuthProvider } from './social/stub-social-oauth.provider';
import { SmtpEmailProvider } from './smtp/smtp-email.provider';

@Public()
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly deepseek: DeepSeekAiProvider,
    private readonly retell: RetellVoiceProvider,
    private readonly email: SmtpEmailProvider,
    private readonly social: StubSocialOAuthProvider,
    private readonly ads: StubAdsProvider,
  ) {}

  @Get('health')
  async health() {
    const [deepseek, retell, email, social, ads] = await Promise.all([
      this.deepseek.health(),
      this.retell.health(),
      this.email.health(),
      this.social.health(),
      this.ads.health(),
    ]);

    const statuses = [
      deepseek.status,
      retell.status,
      email.status,
      social.status,
      ads.status,
    ];
    const status = statuses.includes('error')
      ? ('degraded' as const)
      : ('ready' as const);

    return {
      status,
      checks: {
        deepseek,
        retell,
        email,
        social,
        ads,
      },
    };
  }
}
