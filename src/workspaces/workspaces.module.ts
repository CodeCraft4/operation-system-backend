import { Module } from '@nestjs/common';

import { TenantQueryService } from './tenant-query.service';

@Module({
  providers: [TenantQueryService],
  exports: [TenantQueryService],
})
export class WorkspacesModule {}
