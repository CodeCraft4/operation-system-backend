import { Injectable } from '@nestjs/common';

import { InngestService } from '../inngest/inngest.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly inngest: InngestService,
  ) {}

  live() {
    return { status: 'ok' as const };
  }

  async ready() {
    const [database, supabase] = await Promise.all([
      this.prisma.check(),
      this.supabase.check(),
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
      },
    };
  }
}
