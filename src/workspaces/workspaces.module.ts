import { Module } from '@nestjs/common';

import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { TenantQueryService } from './tenant-query.service';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, TenantQueryService],
  exports: [WorkspacesService, TenantQueryService],
})
export class WorkspacesModule {}
