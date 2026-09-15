import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';

import { CurrentAuth } from './current-auth.decorator';
import { LoginDto } from './dto/login.dto';
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
