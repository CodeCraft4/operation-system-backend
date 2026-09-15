import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthGuard } from './auth.guard';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
  controllers: [IdentityController],
  providers: [
    IdentityService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [IdentityService],
})
export class IdentityModule {}
