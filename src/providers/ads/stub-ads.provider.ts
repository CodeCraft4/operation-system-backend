import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { IntegrationStatus } from '../../common/integration-status';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AdsAccessCheckInput,
  AdsAccessRegisterEntry,
  AdsProvider,
} from '../ads-provider';
import { TokenCryptoService } from '../crypto/token-crypto.service';
import type {
  AdsPlatform,
  ConnectionHealth,
  ProviderHealth,
} from '../provider.types';

type AdsValidateInput = AdsAccessCheckInput;

@Injectable()
export class StubAdsProvider implements AdsProvider {
  readonly kind = 'google_ads' as const;
  private readonly logger = new Logger(StubAdsProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: TokenCryptoService,
  ) {
    this.logger.log(
      'Ads adapter is wired (Google/Meta read-access register stubs).',
    );
  }

  async check(): Promise<IntegrationStatus> {
    if (!this.crypto.isConfigured) {
      return 'skipped';
    }
    try {
      await this.prisma.db.providerConnection.count({
        where: { kind: { in: ['google_ads', 'meta_ads'] } },
      });
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
            ? 'Ads access register store is reachable.'
            : 'Ads access register health failed.',
    };
  }

  async validateReadAccess(
    input: AdsValidateInput,
  ): Promise<AdsAccessRegisterEntry> {
    this.assertPlatform(input.platform);
    const externalKey =
      input.platform === 'google' ? 'google_ads' : 'meta_ads';
    const kind = externalKey;
    const checkedAt = new Date();

    // Stub: connection exists + status connected => can read; otherwise missing permissions.
    let connection = input.connectionId
      ? await this.prisma.db.providerConnection.findFirst({
          where: {
            id: input.connectionId,
            workspaceId: input.workspaceId,
            kind,
          },
          include: { credential: true },
        })
      : await this.prisma.db.providerConnection.findUnique({
          where: {
            workspaceId_externalKey: {
              workspaceId: input.workspaceId,
              externalKey,
            },
          },
          include: { credential: true },
        });

    if (!connection) {
      connection = await this.prisma.db.providerConnection.create({
        data: {
          workspaceId: input.workspaceId,
          kind,
          externalKey,
          status: 'connected',
          externalAccountId:
            input.externalAccountId ?? `stub_${externalKey}_account`,
          displayName: `${input.platform} ads`,
          scopes: ['ads.readonly'],
          canReadAds: true,
          missingPermissions: [],
          lastHealthAt: checkedAt,
          lastHealthMessage: 'Stub ads read access granted.',
          credential: this.crypto.isConfigured
            ? {
                create: {
                  accessTokenEnc: this.crypto.encrypt(
                    `stub-ads-access:${externalKey}`,
                  ),
                  refreshTokenEnc: this.crypto.encrypt(
                    `stub-ads-refresh:${externalKey}`,
                  ),
                  tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
                },
              }
            : undefined,
        },
        include: { credential: true },
      });
    } else {
      const expired =
        connection.credential?.tokenExpiresAt &&
        connection.credential.tokenExpiresAt.getTime() < Date.now();
      const canRead = connection.status === 'connected' && !expired;
      connection = await this.prisma.db.providerConnection.update({
        where: { id: connection.id },
        data: {
          status: expired ? 'expired' : connection.status,
          externalAccountId:
            input.externalAccountId ?? connection.externalAccountId,
          canReadAds: canRead,
          missingPermissions: canRead ? [] : ['ads.readonly'],
          lastHealthAt: checkedAt,
          lastHealthMessage: canRead
            ? 'Ads read access validated (stub).'
            : expired
              ? 'Ads token expired.'
              : 'Ads read access missing or revoked (stub).',
        },
        include: { credential: true },
      });
    }

    return {
      platform: input.platform,
      connectionId: connection.id,
      externalAccountId: connection.externalAccountId ?? undefined,
      canRead: Boolean(connection.canReadAds),
      checkedAt: checkedAt.toISOString(),
      missingPermissions: connection.missingPermissions,
      message: connection.lastHealthMessage ?? undefined,
    };
  }

  async getAccessRegister(
    workspaceId: string,
  ): Promise<AdsAccessRegisterEntry[]> {
    const rows = await this.prisma.db.providerConnection.findMany({
      where: {
        workspaceId,
        kind: { in: ['google_ads', 'meta_ads'] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((row) => ({
      platform: row.kind === 'google_ads' ? 'google' : 'meta',
      connectionId: row.id,
      externalAccountId: row.externalAccountId ?? undefined,
      canRead: Boolean(row.canReadAds),
      checkedAt: (row.lastHealthAt ?? row.updatedAt).toISOString(),
      missingPermissions: row.missingPermissions,
      message: row.lastHealthMessage ?? undefined,
    }));
  }

  async checkConnection(connectionId: string): Promise<ConnectionHealth> {
    const connection = await this.prisma.db.providerConnection.findUnique({
      where: { id: connectionId },
    });
    if (
      !connection ||
      (connection.kind !== 'google_ads' && connection.kind !== 'meta_ads')
    ) {
      throw new NotFoundException('Ads connection was not found.');
    }

    return {
      connectionId: connection.id,
      provider: connection.kind,
      status: connection.status,
      checkedAt: new Date().toISOString(),
      scopes: connection.scopes,
      externalAccountId: connection.externalAccountId ?? undefined,
      message: connection.lastHealthMessage ?? undefined,
    };
  }

  private assertPlatform(platform: string): asserts platform is AdsPlatform {
    if (platform !== 'google' && platform !== 'meta') {
      throw new BadRequestException(
        'Unsupported ads platform. Use google or meta.',
      );
    }
  }
}
