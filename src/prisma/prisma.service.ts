import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import {
  isUsableDatabaseUrl,
  type IntegrationStatus,
} from '../common/integration-status';
import type { Env } from '../config/env';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private client: PrismaClient | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {
    const databaseUrl = this.config.get('DATABASE_URL', { infer: true });
    if (isUsableDatabaseUrl(databaseUrl)) {
      const adapter = new PrismaPg({ connectionString: databaseUrl });
      this.client = new PrismaClient({ adapter });
    }
  }

  async onModuleInit() {
    if (!this.client) {
      this.logger.log(
        'Prisma is idle. Add DATABASE_URL with the real password to connect.',
      );
      return;
    }

    try {
      await this.client.$connect();
      this.logger.log('Prisma connected to Postgres.');
    } catch {
      this.logger.error(
        'Prisma failed to connect. Check DATABASE_URL and the password.',
      );
    }
  }

  get db() {
    if (!this.client) {
      throw new Error('Prisma is not connected.');
    }
    return this.client;
  }

  async onModuleDestroy() {
    await this.client?.$disconnect();
  }

  async check(): Promise<IntegrationStatus> {
    if (!this.client) {
      return 'skipped';
    }

    try {
      await this.client.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'error';
    }
  }
}
