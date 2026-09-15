import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

import type { AuthContext } from '../identity/auth-context';
import { CurrentAuth } from '../identity/current-auth.decorator';
import { Public } from '../identity/public.decorator';
import { StubAdsProvider } from '../providers/ads/stub-ads.provider';
import type { AdsPlatform } from '../providers/provider.types';

class ValidateAdsReadDto {
  @IsIn(['google', 'meta'])
  platform!: AdsPlatform;

  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  externalAccountId?: string;
}

@Controller('ads')
export class AdsController {
  constructor(private readonly ads: StubAdsProvider) {}

  @Public()
  @Get('health')
  health() {
    return this.ads.health();
  }

  @Get('register')
  register(@CurrentAuth() auth: AuthContext) {
    return this.ads.getAccessRegister(auth.workspace.id);
  }

  @Post('validate-read')
  validateRead(
    @CurrentAuth() auth: AuthContext,
    @Body() body: ValidateAdsReadDto,
  ) {
    return this.ads.validateReadAccess({
      workspaceId: auth.workspace.id,
      platform: body.platform,
      connectionId: body.connectionId,
      externalAccountId: body.externalAccountId,
    });
  }

  @Get('connections/:id/health')
  connectionHealth(@Param('id') id: string) {
    return this.ads.checkConnection(id);
  }
}
