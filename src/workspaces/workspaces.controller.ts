import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';

import type { AuthContext } from '../identity/auth-context';
import { CurrentAuth } from '../identity/current-auth.decorator';
import { SwitchWorkspaceDto } from './dto/switch-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.workspacesService.listWorkspaces(
      auth.user.id,
      auth.workspace.id,
    );
  }

  @Post('switch')
  @HttpCode(200)
  switch(@CurrentAuth() auth: AuthContext, @Body() body: SwitchWorkspaceDto) {
    return this.workspacesService.switchWorkspace(
      auth.user.id,
      body.workspaceId,
    );
  }
}
