import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';

import {
  isUsableSecret,
  type IntegrationStatus,
} from '../common/integration-status';
import type { Env } from '../config/env';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient | null = null;
  private readonly authClient: SupabaseClient | null = null;
  private readonly supabaseUrl?: string;
  private readonly supabaseKey?: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.supabaseUrl = this.config.get('SUPABASE_URL', { infer: true });
    this.supabaseKey =
      this.config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true }) ??
      this.config.get('SUPABASE_ANON_KEY', { infer: true }) ??
      this.config.get('SUPABASE_PUBLISHABLE_KEY', { infer: true });

    const authKey =
      this.config.get('SUPABASE_ANON_KEY', { infer: true }) ??
      this.config.get('SUPABASE_PUBLISHABLE_KEY', { infer: true }) ??
      this.supabaseKey;

    if (isUsableSecret(this.supabaseUrl) && isUsableSecret(this.supabaseKey)) {
      this.client = createClient(this.supabaseUrl, this.supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      this.logger.log('Supabase client is configured.');
    } else {
      this.logger.log(
        'Supabase is idle. Add SUPABASE_URL and an API key to connect.',
      );
    }

    if (isUsableSecret(this.supabaseUrl) && isUsableSecret(authKey)) {
      this.authClient = createClient(this.supabaseUrl, authKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
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

  async getUserFromAccessToken(
    accessToken: string,
  ): Promise<Pick<User, 'id' | 'email'> | null> {
    if (!this.authClient) {
      return null;
    }

    const { data, error } = await this.authClient.auth.getUser(accessToken);
    if (error || !data.user?.id || !data.user.email) {
      return null;
    }

    return { id: data.user.id, email: data.user.email };
  }

  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<Session | null> {
    if (!this.authClient) {
      throw new ServiceUnavailableException(
        'Supabase Auth is not configured yet.',
      );
    }

    const { data, error } = await this.authClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) {
      return null;
    }

    return data.session;
  }
}
