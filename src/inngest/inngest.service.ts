import { Injectable } from '@nestjs/common';

import type { IntegrationStatus } from '../prisma/prisma.service';

@Injectable()
export class InngestService {
  readonly status: IntegrationStatus = 'skipped';

  getHandshake() {
    return {
      status: this.status,
      message: 'Inngest is not connected yet. No events will be sent.',
    };
  }
}
