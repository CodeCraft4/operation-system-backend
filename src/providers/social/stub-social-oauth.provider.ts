import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import {
  isUsableSecret,
  type IntegrationStatus,
} from '../../common/integration-status';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenCryptoService } from '../crypto/token-crypto.service';
import type {
  OAuthAuthorizationUrl,
  OAuthCallbackInput,
  OAuthStartInput,
  ProviderConnectionResult,
  SocialOAuthProvider,
} from '../social-oauth-provider';
import type {
  ConnectionHealth,
  ProviderHealth,
  SocialAccountType,
} from '../provider.types';

const SOCIAL_TYPES: SocialAccountType[] = [
  'facebook',
  'instagram',
  'linkedin',
  'x',
];

@Injectable()
export class StubSocialOAuthProvider implements SocialOAuthProvider {
  readonly kind = 'social' as const;
  private readonly logger = new Logger(StubSocialOAuthProvider.name);
  private readonly frontendOrigin: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: TokenCryptoService,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.frontendOrigin = this.config.get('FRONTEND_ORIGIN', { infer: true });
    this.logger.log(
      'Social OAuth adapter is wired (stub exchange + persisted connections).',
    );
  }

  listAccountTypes(): SocialAccountType[] {
    return [...SOCIAL_TYPES];
  }

  async check(): Promise<IntegrationStatus> {
    if (!this.crypto.isConfigured) {
      return 'skipped';
    }
    try {
      await this.prisma.db.providerConnection.count();
      return 'ok';
    } catch {
      return 'error';
    }
  }

  async health(): Promise<ProviderHealth> {
    const status = await this.check();
    return {
      provider: this.kind,
      status,
      checkedAt: new Date().toISOString(),
      message:
        status === 'skipped'
          ? 'PROVIDER_TOKEN_ENCRYPTION_KEY is not configured.'
          : status === 'ok'
            ? 'Social connection store is reachable.'
            : 'Social connection store health failed.',
    };
  }

  async getAuthorizationUrl(
    input: OAuthStartInput,
  ): Promise<OAuthAuthorizationUrl> {
    this.assertAccountType(input.accountType);
    const state = input.state || randomUUID();
    const url = new URL(
      `${this.frontendOrigin.replace(/\/$/, '')}/social/oauth/stub`,
    );
    url.searchParams.set('accountType', input.accountType);
    url.searchParams.set('workspaceId', input.workspaceId);
    url.searchParams.set('state', state);
    url.searchParams.set('redirectUri', input.redirectUri);

    await this.prisma.db.providerConnection.upsert({
      where: {
        workspaceId_externalKey: {
          workspaceId: input.workspaceId,
          externalKey: input.accountType,
        },
      },
      create: {
        workspaceId: input.workspaceId,
        kind: 'social',
        externalKey: input.accountType,
        accountType: input.accountType,
        status: 'pending',
        scopes: input.scopes ?? ['email', 'profile'],
        displayName: `${input.accountType} connection`,
      },
      update: {
        status: 'pending',
        scopes: input.scopes ?? ['email', 'profile'],
      },
    });

    return {
      url: url.toString(),
      state,
      accountType: input.accountType,
    };
  }

  async handleCallback(
    input: OAuthCallbackInput,
  ): Promise<ProviderConnectionResult> {
    this.assertAccountType(input.accountType);
    if (!isUsableSecret(input.code)) {
      throw new NotFoundException('OAuth code is required.');
    }
    if (!this.crypto.isConfigured) {
      throw new NotFoundException(
        'PROVIDER_TOKEN_ENCRYPTION_KEY is required to store tokens.',
      );
    }

    const externalAccountId = `stub_${input.accountType}_${input.code.slice(0, 8)}`;
    const accessTokenEnc = this.crypto.encrypt(`stub-access:${input.code}`);
    const refreshTokenEnc = this.crypto.encrypt(`stub-refresh:${input.state}`);
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const connection = await this.prisma.db.providerConnection.upsert({
      where: {
        workspaceId_externalKey: {
          workspaceId: input.workspaceId,
          externalKey: input.accountType,
        },
      },
      create: {
        workspaceId: input.workspaceId,
        kind: 'social',
        externalKey: input.accountType,
        accountType: input.accountType,
        status: 'connected',
        externalAccountId,
        scopes: ['email', 'profile'],
        displayName: `${input.accountType} connection`,
        lastHealthAt: new Date(),
        lastHealthMessage: 'Connected via stub OAuth callback.',
        credential: {
          create: {
            accessTokenEnc,
            refreshTokenEnc,
            tokenExpiresAt,
          },
        },
      },
      update: {
        status: 'connected',
        externalAccountId,
        lastHealthAt: new Date(),
        lastHealthMessage: 'Connected via stub OAuth callback.',
        credential: {
          upsert: {
            create: {
              accessTokenEnc,
              refreshTokenEnc,
              tokenExpiresAt,
            },
            update: {
              accessTokenEnc,
              refreshTokenEnc,
              tokenExpiresAt,
            },
          },
        },
      },
    });

    return {
      connectionId: connection.id,
      accountType: input.accountType,
      status: 'connected',
      externalAccountId: connection.externalAccountId ?? undefined,
      scopes: connection.scopes,
    };
  }

  async checkConnection(connectionId: string): Promise<ConnectionHealth> {
    const connection = await this.requireConnection(connectionId);
    const checkedAt = new Date().toISOString();
    let status = connection.status as ConnectionHealth['status'];
    let message = connection.lastHealthMessage ?? undefined;

    if (
      connection.credential?.tokenExpiresAt &&
      connection.credential.tokenExpiresAt.getTime() < Date.now() &&
      status === 'connected'
    ) {
      status = 'expired';
      message = 'Access token has expired.';
      await this.prisma.db.providerConnection.update({
        where: { id: connection.id },
        data: {
          status: 'expired',
          lastHealthAt: new Date(),
          lastHealthMessage: message,
        },
      });
    }

    return {
      connectionId: connection.id,
      provider: this.kind,
      status,
      checkedAt,
      scopes: connection.scopes,
      externalAccountId: connection.externalAccountId ?? undefined,
      message,
    };
  }

  async disconnect(connectionId: string): Promise<ProviderConnectionResult> {
    const connection = await this.requireConnection(connectionId);
    const updated = await this.prisma.db.providerConnection.update({
      where: { id: connection.id },
      data: {
        status: 'disconnected',
        lastHealthAt: new Date(),
        lastHealthMessage: 'Disconnected by user.',
        credential: connection.credential
          ? {
              delete: true,
            }
          : undefined,
      },
    });

    return {
      connectionId: updated.id,
      accountType: updated.accountType!,
      status: 'disconnected',
      externalAccountId: updated.externalAccountId ?? undefined,
      scopes: updated.scopes,
    };
  }

  async reconnect(connectionId: string): Promise<OAuthAuthorizationUrl> {
    const connection = await this.requireConnection(connectionId);
    if (!connection.accountType) {
      throw new NotFoundException('Social account type is missing.');
    }

    return this.getAuthorizationUrl({
      workspaceId: connection.workspaceId,
      accountType: connection.accountType,
      redirectUri: `${this.frontendOrigin.replace(/\/$/, '')}/social/callback`,
      state: randomUUID(),
      scopes: connection.scopes,
    });
  }

  async handleExpiredToken(connectionId: string): Promise<ConnectionHealth> {
    const connection = await this.requireConnection(connectionId);
    const updated = await this.prisma.db.providerConnection.update({
      where: { id: connection.id },
      data: {
        status: 'expired',
        lastHealthAt: new Date(),
        lastHealthMessage:
          'Token marked expired. Reconnect required (stub has no refresh).',
      },
    });

    return {
      connectionId: updated.id,
      provider: this.kind,
      status: 'expired',
      checkedAt: new Date().toISOString(),
      scopes: updated.scopes,
      externalAccountId: updated.externalAccountId ?? undefined,
      message: updated.lastHealthMessage ?? undefined,
    };
  }

  async listConnections(workspaceId: string) {
    const rows = await this.prisma.db.providerConnection.findMany({
      where: { workspaceId, kind: 'social' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        accountType: true,
        status: true,
        externalAccountId: true,
        scopes: true,
        displayName: true,
        lastHealthAt: true,
        lastHealthMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return rows;
  }

  private assertAccountType(accountType: string): asserts accountType is SocialAccountType {
    if (!SOCIAL_TYPES.includes(accountType as SocialAccountType)) {
      throw new BadRequestException(
        'Unsupported social account type. Use facebook, instagram, linkedin, or x.',
      );
    }
  }

  private async requireConnection(connectionId: string) {
    const connection = await this.prisma.db.providerConnection.findUnique({
      where: { id: connectionId },
      include: { credential: true },
    });
    if (!connection || connection.kind !== 'social') {
      throw new NotFoundException('Social connection was not found.');
    }
    return connection;
  }
}
