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
import type { SupabaseSocialAuthProvider } from '../identity/social-auth.providers';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient | null = null;
  private readonly authClient: SupabaseClient | null = null;
  private readonly supabaseUrl?: string;
  private readonly supabaseKey?: string;
  private readonly oauthRedirectUrl: string;

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

    const frontendOrigin = this.config.get('FRONTEND_ORIGIN', { infer: true });
    this.oauthRedirectUrl =
      this.config.get('SUPABASE_OAUTH_REDIRECT_URL', { infer: true }) ??
      `${frontendOrigin.replace(/\/$/, '')}/auth/callback`;

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

  /**
   * Soft readiness for Google/Facebook OAuth start.
   * Providers must also be enabled in the Supabase Auth dashboard.
   */
  checkSocialAuth(): {
    status: IntegrationStatus;
    redirectUrl: string;
    providers: Record<SupabaseSocialAuthProvider, IntegrationStatus>;
  } {
    if (!this.authClient) {
      return {
        status: 'skipped',
        redirectUrl: this.oauthRedirectUrl,
        providers: { google: 'skipped', facebook: 'skipped' },
      };
    }

    return {
      status: 'ok',
      redirectUrl: this.oauthRedirectUrl,
      providers: { google: 'ok', facebook: 'ok' },
    };
  }

  async getOAuthSignInUrl(
    provider: SupabaseSocialAuthProvider,
    redirectTo = this.oauthRedirectUrl,
  ): Promise<{ url: string; redirectTo: string }> {
    if (!this.authClient) {
      throw new ServiceUnavailableException(
        'Supabase Auth is not configured yet.',
      );
    }

    const { data, error } = await this.authClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      throw new ServiceUnavailableException(
        `Unable to start ${provider} sign-in. Enable the provider in Supabase Auth.`,
      );
    }

    return { url: data.url, redirectTo };
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
