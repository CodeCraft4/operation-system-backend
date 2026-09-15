import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthGuard } from './auth.guard';
import type { AuthContext } from './auth-context';
import { IdentityService } from './identity.service';

describe('AuthGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const identity = {
    authenticate: jest.fn(),
  };
  const guard = new AuthGuard(
    reflector as unknown as Reflector,
    identity as unknown as IdentityService,
  );

  const auth: AuthContext = {
    user: {
      id: 'user-1',
      email: 'operator.alpha@pilot.local',
      name: 'Alpha Operator',
      supabaseAuthId: 'sb-1',
    },
    workspace: {
      id: 'ws-alpha',
      name: 'Pilot Alpha',
      slug: 'pilot-alpha',
      role: 'operator',
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  function context(headers: Record<string, string | undefined>) {
    const request = {
      header: (name: string) => headers[name.toLowerCase()],
      auth: undefined as AuthContext | undefined,
    };
    return {
      request,
      ctx: {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext,
    };
  }

  it('allows public routes without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { ctx } = context({});

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(identity.authenticate).not.toHaveBeenCalled();
  });

  it('rejects a missing token on protected routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const { ctx } = context({});

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the user and workspace when the token is valid', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    identity.authenticate.mockResolvedValue(auth);
    const { ctx, request } = context({
      authorization: 'Bearer valid-token',
      'x-workspace-id': 'ws-alpha',
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(identity.authenticate).toHaveBeenCalledWith(
      'valid-token',
      'ws-alpha',
    );
    expect(request.auth).toEqual(auth);
  });
});
