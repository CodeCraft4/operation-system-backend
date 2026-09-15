import type { MembershipRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  supabaseAuthId: string | null;
};

export type AuthWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: MembershipRole;
};

export type AuthContext = {
  user: AuthUser;
  workspace: AuthWorkspace;
};
