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

  ready() {
    return {
      status: 'ready' as const,
      checks: {
        app: 'ok' as const,
        database: this.prisma.status,
        supabase: this.supabase.status,
        inngest: this.inngest.status,
      },
    };
  }
}
