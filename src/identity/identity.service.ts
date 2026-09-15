import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { AuthContext } from './auth-context';

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async authenticate(
    accessToken: string,
    workspaceId?: string,
  ): Promise<AuthContext> {
    const supabaseUser =
      await this.supabase.getUserFromAccessToken(accessToken);
    if (!supabaseUser?.email) {
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    const user = await this.findOrLinkUser(supabaseUser.id, supabaseUser.email);
    const memberships = await this.prisma.db.membership.findMany({
      where: { userId: user.id },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });

    if (memberships.length === 0) {
      throw new ForbiddenException('You do not belong to a workspace.');
    }

    const targetWorkspaceId = workspaceId ?? user.currentWorkspaceId;
    const membership = targetWorkspaceId
      ? memberships.find((item) => item.workspaceId === targetWorkspaceId)
      : memberships[0];

    if (!membership) {
      throw new ForbiddenException('Workspace was not found for this account.');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        supabaseAuthId: user.supabaseAuthId,
      },
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        role: membership.role,
      },
    };
  }

  async login(email: string, password: string) {
    const session = await this.supabase.signInWithPassword(email, password);
    if (!session?.access_token || !session.user.email) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return {
      accessToken: session.access_token,
      tokenType: 'Bearer',
      expiresIn: session.expires_in,
      user: {
        email: session.user.email,
        supabaseAuthId: session.user.id,
      },
    };
  }

  private async findOrLinkUser(supabaseAuthId: string, email: string) {
    const byAuthId = await this.prisma.db.user.findUnique({
      where: { supabaseAuthId },
    });
    if (byAuthId) {
      return byAuthId;
    }

    const byEmail = await this.prisma.db.user.findUnique({
      where: { email },
    });
    if (!byEmail) {
      throw new UnauthorizedException('No account is linked to this sign-in.');
    }

    if (byEmail.supabaseAuthId && byEmail.supabaseAuthId !== supabaseAuthId) {
      throw new UnauthorizedException('No account is linked to this sign-in.');
    }

    return this.prisma.db.user.update({
      where: { id: byEmail.id },
      data: { supabaseAuthId },
    });
  }
}
