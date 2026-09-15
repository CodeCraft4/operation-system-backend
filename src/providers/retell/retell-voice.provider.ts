import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  isUsableSecret,
  type IntegrationStatus,
} from '../../common/integration-status';
import type { Env } from '../../config/env';
import { fetchWithTimeout } from '../fetch-with-timeout';
import type { ProviderHealth } from '../provider.types';
import type { VoiceProvider } from '../voice-provider';

@Injectable()
export class RetellVoiceProvider implements VoiceProvider {
  readonly kind = 'retell' as const;
  private readonly logger = new Logger(RetellVoiceProvider.name);
  private readonly apiKey?: string;
  private readonly agentId?: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly configured: boolean;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.apiKey = this.config.get('RETELL_API_KEY', { infer: true });
    this.agentId = this.config.get('RETELL_AGENT_ID', { infer: true });
    this.baseUrl = (
      this.config.get('RETELL_BASE_URL', { infer: true }) ??
      'https://api.retellai.com'
    ).replace(/\/$/, '');
    this.timeoutMs =
      this.config.get('RETELL_TIMEOUT_MS', { infer: true }) ?? 15_000;
    this.configured =
      isUsableSecret(this.apiKey) && isUsableSecret(this.agentId);

    if (this.configured) {
      this.logger.log('Retell client is configured.');
    } else {
      this.logger.log(
        'Retell is idle. Add RETELL_API_KEY and RETELL_AGENT_ID to connect.',
      );
    }
  }

  async check(): Promise<IntegrationStatus> {
    const health = await this.checkAccountHealth();
    return health.status;
  }

  async health(): Promise<ProviderHealth> {
    return this.checkAccountHealth();
  }

  async checkAccountHealth(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();

    if (!this.configured || !this.apiKey || !this.agentId) {
      return {
        provider: this.kind,
        status: 'skipped',
        checkedAt,
        message: 'RETELL_API_KEY or RETELL_AGENT_ID is not configured.',
      };
    }

    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/get-agent/${this.agentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
        this.timeoutMs,
        this.kind,
      );

      if (!response.ok) {
        return {
          provider: this.kind,
          status: 'error',
          checkedAt,
          message: `Retell agent health failed with HTTP ${response.status}.`,
        };
      }

      return {
        provider: this.kind,
        status: 'ok',
        checkedAt,
        message: 'Retell agent is reachable.',
      };
    } catch {
      return {
        provider: this.kind,
        status: 'error',
        checkedAt,
        message: 'Retell account-health check failed.',
      };
    }
  }
}
