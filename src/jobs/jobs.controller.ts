import { Controller, Get } from '@nestjs/common';

import { Public } from '../identity/public.decorator';
import { InngestService } from '../inngest/inngest.service';

@Public()
@Controller('jobs')
export class JobsController {
  constructor(private readonly inngest: InngestService) {}

  @Get('inngest')
  inngestHandshake() {
    return this.inngest.getHandshake();
  }
}
