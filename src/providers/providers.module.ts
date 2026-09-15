import { Global, Module } from '@nestjs/common';

import {
  ADS_PROVIDER,
  AI_PROVIDER,
  EMAIL_PROVIDER,
  SOCIAL_OAUTH_PROVIDER,
  VOICE_PROVIDER,
} from './provider-adapter';
import { StubAdsProvider } from './ads/stub-ads.provider';
import { TokenCryptoService } from './crypto/token-crypto.service';
import { DeepSeekAiProvider } from './deepseek/deepseek-ai.provider';
import { ProvidersController } from './providers.controller';
import { RetellVoiceProvider } from './retell/retell-voice.provider';
import { StubSocialOAuthProvider } from './social/stub-social-oauth.provider';
import { SmtpEmailProvider } from './smtp/smtp-email.provider';

@Global()
@Module({
  controllers: [ProvidersController],
  providers: [
    TokenCryptoService,
    DeepSeekAiProvider,
    RetellVoiceProvider,
    SmtpEmailProvider,
    StubSocialOAuthProvider,
    StubAdsProvider,
    { provide: AI_PROVIDER, useExisting: DeepSeekAiProvider },
    { provide: VOICE_PROVIDER, useExisting: RetellVoiceProvider },
    { provide: EMAIL_PROVIDER, useExisting: SmtpEmailProvider },
    { provide: SOCIAL_OAUTH_PROVIDER, useExisting: StubSocialOAuthProvider },
    { provide: ADS_PROVIDER, useExisting: StubAdsProvider },
  ],
  exports: [
    TokenCryptoService,
    DeepSeekAiProvider,
    RetellVoiceProvider,
    SmtpEmailProvider,
    StubSocialOAuthProvider,
    StubAdsProvider,
    AI_PROVIDER,
    VOICE_PROVIDER,
    EMAIL_PROVIDER,
    SOCIAL_OAUTH_PROVIDER,
    ADS_PROVIDER,
  ],
})
export class ProvidersModule {}
