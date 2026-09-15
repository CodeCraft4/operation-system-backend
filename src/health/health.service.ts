import { Injectable } from '@nestjs/common';

import { InngestService } from '../inngest/inngest.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepSeekAiProvider } from '../providers/deepseek/deepseek-ai.provider';
import { RetellVoiceProvider } from '../providers/retell/retell-voice.provider';
import { SmtpEmailProvider } from '../providers/smtp/smtp-email.provider';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly inngest: InngestService,
    private readonly deepseek: DeepSeekAiProvider,
    private readonly retell: RetellVoiceProvider,
    private readonly email: SmtpEmailProvider,
  ) {}

  live() {
    return { status: 'ok' as const };
  }

  async ready() {
    const [database, supabase, deepseek, retell, email] = await Promise.all([
      this.prisma.check(),
      this.supabase.check(),
      this.deepseek.check(),
      this.retell.check(),
      this.email.check(),
    ]);
    const inngest = this.inngest.status;
    const degraded = database === 'error' || supabase === 'error';

    return {
      status: degraded ? ('degraded' as const) : ('ready' as const),
      checks: {
        app: 'ok' as const,
        database,
        supabase,
        inngest,
        deepseek,
        retell,
        email,
      },
    };
  }
}
