import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { IdentityService } from './identity.service';

describe('IdentityService', () => {
  const prisma = {
    db: {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      membership: {
        findMany: jest.fn(),
      },
    },
  };
  const supabase = {
    getUserFromAccessToken: jest.fn(),
    signInWithPassword: jest.fn(),
  };
  const service = new IdentityService(
    prisma as unknown as PrismaService,
    supabase as unknown as SupabaseService,
  );

  const user = {
    id: 'user-1',
    email: 'operator.alpha@pilot.local',
    name: 'Alpha Operator',
    supabaseAuthId: null as string | null,
  };
  const linkedUser = { ...user, supabaseAuthId: 'sb-1' };
  const workspace = {
    id: 'ws-alpha',
    name: 'Pilot Alpha',
    slug: 'pilot-alpha',
  };
  const membership = {
    workspaceId: workspace.id,
    userId: user.id,
    role: 'operator' as const,
    workspace,
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns the current user and workspace for a valid token', async () => {
    supabase.getUserFromAccessToken.mockResolvedValue({
      id: 'sb-1',
      email: user.email,
    });
    prisma.db.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(user);
    prisma.db.user.update.mockResolvedValue(linkedUser);
    prisma.db.membership.findMany.mockResolvedValue([membership]);

    await expect(service.authenticate('valid-token')).resolves.toEqual({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        supabaseAuthId: 'sb-1',
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        role: 'operator',
      },
    });
  });

  it('rejects an invalid token', async () => {
    supabase.getUserFromAccessToken.mockResolvedValue(null);

    await expect(service.authenticate('bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a sign-in that is not linked to an app user', async () => {
    supabase.getUserFromAccessToken.mockResolvedValue({
      id: 'sb-unknown',
      email: 'unknown@pilot.local',
    });
    prisma.db.user.findUnique.mockResolvedValue(null);

    await expect(service.authenticate('valid-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a user with no workspace membership', async () => {
    supabase.getUserFromAccessToken.mockResolvedValue({
      id: 'sb-1',
      email: user.email,
    });
    prisma.db.user.findUnique.mockResolvedValue(linkedUser);
    prisma.db.membership.findMany.mockResolvedValue([]);

    await expect(service.authenticate('valid-token')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects a workspace the user does not belong to', async () => {
    supabase.getUserFromAccessToken.mockResolvedValue({
      id: 'sb-1',
      email: user.email,
    });
    prisma.db.user.findUnique.mockResolvedValue(linkedUser);
    prisma.db.membership.findMany.mockResolvedValue([membership]);

    await expect(
      service.authenticate('valid-token', 'ws-beta'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns a session for a valid email and password', async () => {
    supabase.signInWithPassword.mockResolvedValue({
      access_token: 'access-token',
      expires_in: 3600,
      user: { id: 'sb-1', email: user.email },
    });

    await expect(service.login(user.email, 'secret1')).resolves.toEqual({
      accessToken: 'access-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        email: user.email,
        supabaseAuthId: 'sb-1',
      },
    });
  });

  it('rejects an invalid email or password', async () => {
    supabase.signInWithPassword.mockResolvedValue(null);

    await expect(service.login(user.email, 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
