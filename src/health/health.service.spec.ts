import { Test, TestingModule } from '@nestjs/testing';

import { InngestService } from '../inngest/inngest.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepSeekAiProvider } from '../providers/deepseek/deepseek-ai.provider';
import { RetellVoiceProvider } from '../providers/retell/retell-voice.provider';
import { SmtpEmailProvider } from '../providers/smtp/smtp-email.provider';
import { SupabaseService } from '../supabase/supabase.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: { check: async () => 'skipped' },
        },
        {
          provide: SupabaseService,
          useValue: { check: async () => 'skipped' },
        },
        InngestService,
        {
          provide: DeepSeekAiProvider,
          useValue: { check: async () => 'skipped' },
        },
        {
          provide: RetellVoiceProvider,
          useValue: { check: async () => 'skipped' },
        },
        {
          provide: SmtpEmailProvider,
          useValue: { check: async () => 'skipped' },
        },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it('returns live status', () => {
    expect(service.live()).toEqual({ status: 'ok' });
  });

  it('returns skipped integrations until they are connected', async () => {
    await expect(service.ready()).resolves.toEqual({
      status: 'ready',
      checks: {
        app: 'ok',
        database: 'skipped',
        supabase: 'skipped',
        inngest: 'skipped',
        deepseek: 'skipped',
        retell: 'skipped',
        email: 'skipped',
      },
    });
  });
});
