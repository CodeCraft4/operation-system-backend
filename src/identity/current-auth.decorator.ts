import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthContext } from './auth-context';

type AuthRequest = Request & { auth?: AuthContext };

export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    if (!request.auth) {
      throw new Error('Auth context is missing from the request.');
    }
    return request.auth;
  },
);
