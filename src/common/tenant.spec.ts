import { NotFoundException } from '@nestjs/common';

import { requireWorkspaceRecord, workspaceWhere } from './tenant';

describe('tenant helpers', () => {
  const alpha = 'workspace-alpha';
  const beta = 'workspace-beta';

  it('scopes queries to one workspace', () => {
    expect(workspaceWhere(alpha)).toEqual({ workspaceId: alpha });
  });

  it('returns a record that belongs to the current workspace', () => {
    const draft = { id: 'draft-1', workspaceId: alpha, body: 'ok' };
    expect(requireWorkspaceRecord(draft, alpha)).toEqual(draft);
  });

  it('hides a record from another workspace', () => {
    const draft = { id: 'draft-1', workspaceId: beta, body: 'secret' };
    expect(() => requireWorkspaceRecord(draft, alpha)).toThrow(
      NotFoundException,
    );
  });

  it('hides a missing record', () => {
    expect(() => requireWorkspaceRecord(null, alpha)).toThrow(
      NotFoundException,
    );
  });
});
