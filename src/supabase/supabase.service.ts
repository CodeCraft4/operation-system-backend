import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  isUsableSecret,
  type IntegrationStatus,
} from '../common/integration-status';
import type { Env } from '../config/env';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient | null = null;
  private readonly supabaseUrl?: string;
  private readonly supabaseKey?: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.supabaseUrl = this.config.get('SUPABASE_URL', { infer: true });
    this.supabaseKey =
      this.config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true }) ??
      this.config.get('SUPABASE_ANON_KEY', { infer: true }) ??
      this.config.get('SUPABASE_PUBLISHABLE_KEY', { infer: true });

    if (isUsableSecret(this.supabaseUrl) && isUsableSecret(this.supabaseKey)) {
      this.client = createClient(this.supabaseUrl, this.supabaseKey);
      this.logger.log('Supabase client is configured.');
    } else {
      this.logger.log(
        'Supabase is idle. Add SUPABASE_URL and an API key to connect.',
      );
    }
  }

  async check(): Promise<IntegrationStatus> {
    if (!this.client || !this.supabaseUrl || !this.supabaseKey) {
      return 'skipped';
    }

    try {
      const response = await fetch(`${this.supabaseUrl}/auth/v1/health`, {
        headers: {
          apikey: this.supabaseKey,
          Authorization: `Bearer ${this.supabaseKey}`,
        },
      });
      return response.ok ? 'ok' : 'error';
    } catch {
      return 'error';
    }
  }
}
