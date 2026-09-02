import { Injectable } from '@nestjs/common';

import type { IntegrationStatus } from '../prisma/prisma.service';

@Injectable()
export class SupabaseService {
  readonly status: IntegrationStatus = 'skipped';
}
