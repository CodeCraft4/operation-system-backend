import { Controller, Get } from '@nestjs/common';

import { InngestService } from '../inngest/inngest.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly inngest: InngestService) {}

  @Get('inngest')
  inngestHandshake() {
    return this.inngest.getHandshake();
  }
}
