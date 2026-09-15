import { NotFoundException } from '@nestjs/common';

export function workspaceWhere(workspaceId: string) {
  return { workspaceId };
}

export function requireWorkspaceRecord<T extends { workspaceId: string }>(
  record: T | null | undefined,
  workspaceId: string,
): T {
  if (!record || record.workspaceId !== workspaceId) {
    throw new NotFoundException('Record was not found in this workspace.');
  }
  return record;
}
