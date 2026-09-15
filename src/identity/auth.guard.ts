import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { AuthContext } from './auth-context';
import { extractBearerToken } from './bearer-token';
import { IdentityService } from './identity.service';
import { IS_PUBLIC_KEY } from './public.decorator';

type AuthRequest = Request & { auth?: AuthContext };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identity: IdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = extractBearerToken(request.header('authorization'));
    if (!token) {
      throw new UnauthorizedException('Missing access token.');
    }

    request.auth = await this.identity.authenticate(
      token,
      request.header('x-workspace-id'),
    );
    return true;
  }
}
