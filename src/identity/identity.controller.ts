import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';

import { CurrentAuth } from './current-auth.decorator';
import { LoginDto } from './dto/login.dto';
import { SocialOAuthCallbackDto } from './dto/social-oauth-callback.dto';
import type { AuthContext } from './auth-context';
import { IdentityService } from './identity.service';
import { Public } from './public.decorator';

@Controller()
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Public()
  @Post('auth/login')
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.identity.login(body.email, body.password);
  }

  @Public()
  @Get('auth/oauth/health')
  socialAuthHealth() {
    return this.identity.getSocialAuthHealth();
  }

  @Public()
  @Get('auth/oauth/:provider')
  startSocialOAuth(@Param('provider') provider: string) {
    return this.identity.startSocialOAuth(provider);
  }

  @Public()
  @Post('auth/oauth/callback')
  @HttpCode(200)
  completeSocialOAuth(@Body() body: SocialOAuthCallbackDto) {
    return this.identity.completeSocialLogin(body.accessToken);
  }

  @Get('me')
  me(@CurrentAuth() auth: AuthContext) {
    return {
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
      },
      workspace: {
        id: auth.workspace.id,
        name: auth.workspace.name,
        slug: auth.workspace.slug,
        role: auth.workspace.role,
      },
    };
  }
}
