import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { randomUUID } from 'crypto';

import type { AuthContext } from '../identity/auth-context';
import { CurrentAuth } from '../identity/current-auth.decorator';
import { Public } from '../identity/public.decorator';
import { StubSocialOAuthProvider } from '../providers/social/stub-social-oauth.provider';
import type { SocialAccountType } from '../providers/provider.types';

class SocialOAuthStartDto {
  @IsString()
  @MinLength(3)
  redirectUri!: string;

  @IsOptional()
  @IsString()
  state?: string;
}

class SocialOAuthCallbackDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @IsString()
  @MinLength(3)
  state!: string;

  @IsString()
  @MinLength(3)
  redirectUri!: string;
}

@Controller('social')
export class SocialController {
  constructor(private readonly social: StubSocialOAuthProvider) {}

  @Public()
  @Get('account-types')
  accountTypes() {
    return { accountTypes: this.social.listAccountTypes() };
  }

  @Public()
  @Get('health')
  health() {
    return this.social.health();
  }

  @Get('connections')
  list(@CurrentAuth() auth: AuthContext) {
    return this.social.listConnections(auth.workspace.id);
  }

  @Post('oauth/:accountType/start')
  start(
    @CurrentAuth() auth: AuthContext,
    @Param('accountType') accountType: string,
    @Body() body: SocialOAuthStartDto,
  ) {
    return this.social.getAuthorizationUrl({
      workspaceId: auth.workspace.id,
      accountType: accountType as SocialAccountType,
      redirectUri: body.redirectUri,
      state: body.state ?? randomUUID(),
    });
  }

  @Post('oauth/:accountType/callback')
  callback(
    @CurrentAuth() auth: AuthContext,
    @Param('accountType') accountType: string,
    @Body() body: SocialOAuthCallbackDto,
  ) {
    return this.social.handleCallback({
      workspaceId: auth.workspace.id,
      accountType: accountType as SocialAccountType,
      code: body.code,
      state: body.state,
      redirectUri: body.redirectUri,
    });
  }

  @Get('connections/:id/health')
  connectionHealth(@Param('id') id: string) {
    return this.social.checkConnection(id);
  }

  @Post('connections/:id/disconnect')
  disconnect(@Param('id') id: string) {
    return this.social.disconnect(id);
  }

  @Post('connections/:id/reconnect')
  reconnect(@Param('id') id: string) {
    return this.social.reconnect(id);
  }

  @Post('connections/:id/expired')
  expired(@Param('id') id: string) {
    return this.social.handleExpiredToken(id);
  }
}
