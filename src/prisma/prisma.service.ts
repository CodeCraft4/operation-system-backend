import { Injectable } from '@nestjs/common';

export type IntegrationStatus = 'ok' | 'skipped';

@Injectable()
export class PrismaService {
  readonly status: IntegrationStatus = 'skipped';
}
