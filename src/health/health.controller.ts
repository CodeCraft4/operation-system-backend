import { Controller, Get } from '@nestjs/common';

import { Public } from '../identity/public.decorator';
import { HealthService } from './health.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  live() {
    return this.healthService.live();
  }

  @Get('ready')
  ready() {
    return this.healthService.ready();
  }
}
