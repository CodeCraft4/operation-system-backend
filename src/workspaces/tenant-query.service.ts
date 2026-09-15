import { Injectable } from '@nestjs/common';

import { requireWorkspaceRecord, workspaceWhere } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantQueryService {
  constructor(private readonly prisma: PrismaService) {}

  findDraft(workspaceId: string, id: string) {
    return this.prisma.db.contentDraft.findFirst({
      where: { id, ...workspaceWhere(workspaceId) },
    });
  }

  async getDraft(workspaceId: string, id: string) {
    const draft = await this.findDraft(workspaceId, id);
    return requireWorkspaceRecord(draft, workspaceId);
  }

  updateDraft(workspaceId: string, id: string, title: string) {
    return this.prisma.db.contentDraft.updateMany({
      where: { id, ...workspaceWhere(workspaceId) },
      data: { title },
    });
  }

  deleteDraft(workspaceId: string, id: string) {
    return this.prisma.db.contentDraft.deleteMany({
      where: { id, ...workspaceWhere(workspaceId) },
    });
  }
}
