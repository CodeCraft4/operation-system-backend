import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TenantQueryService } from '../src/workspaces/tenant-query.service';

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenant: TenantQueryService;
  let alphaWorkspaceId: string;
  let betaWorkspaceId: string;
  let alphaDraftId: string;
  let betaDraftId: string;
  let alphaRequestId: string;
  let betaRequestId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    tenant = app.get(TenantQueryService);

    const alpha = await prisma.db.workspace.findUnique({
      where: { slug: 'pilot-alpha' },
    });
    const beta = await prisma.db.workspace.findUnique({
      where: { slug: 'pilot-beta' },
    });

    if (!alpha || !beta) {
      throw new Error('Seed workspaces are missing. Run npm run prisma:seed.');
    }

    alphaWorkspaceId = alpha.id;
    betaWorkspaceId = beta.id;

    const marker = `tenant-isolation-${Date.now()}`;

    const alphaRequest = await prisma.db.contentRequest.create({
      data: {
        workspaceId: alphaWorkspaceId,
        prompt: marker,
      },
    });
    const betaRequest = await prisma.db.contentRequest.create({
      data: {
        workspaceId: betaWorkspaceId,
        prompt: marker,
      },
    });
    alphaRequestId = alphaRequest.id;
    betaRequestId = betaRequest.id;

    const alphaDraft = await prisma.db.contentDraft.create({
      data: {
        workspaceId: alphaWorkspaceId,
        contentRequestId: alphaRequest.id,
        title: marker,
        body: 'alpha only',
      },
    });
    const betaDraft = await prisma.db.contentDraft.create({
      data: {
        workspaceId: betaWorkspaceId,
        contentRequestId: betaRequest.id,
        title: marker,
        body: 'beta only',
      },
    });
    alphaDraftId = alphaDraft.id;
    betaDraftId = betaDraft.id;
  });

  afterAll(async () => {
    try {
      if (prisma && alphaDraftId) {
        await prisma.db.contentDraft.deleteMany({
          where: { id: alphaDraftId },
        });
      }
      if (prisma && betaDraftId) {
        await prisma.db.contentDraft.deleteMany({ where: { id: betaDraftId } });
      }
      if (prisma && alphaRequestId) {
        await prisma.db.contentRequest.deleteMany({
          where: { id: alphaRequestId },
        });
      }
      if (prisma && betaRequestId) {
        await prisma.db.contentRequest.deleteMany({
          where: { id: betaRequestId },
        });
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it('does not let workspace A read workspace B drafts', async () => {
    const leaked = await tenant.findDraft(alphaWorkspaceId, betaDraftId);
    expect(leaked).toBeNull();
    await expect(
      tenant.getDraft(alphaWorkspaceId, betaDraftId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not let workspace A change workspace B drafts', async () => {
    const updated = await tenant.updateDraft(
      alphaWorkspaceId,
      betaDraftId,
      'hacked by alpha',
    );
    expect(updated.count).toBe(0);

    const betaDraft = await tenant.getDraft(betaWorkspaceId, betaDraftId);
    expect(betaDraft.body).toBe('beta only');
    expect(betaDraft.title).not.toBe('hacked by alpha');
  });

  it('does not let workspace A delete workspace B drafts', async () => {
    const deleted = await tenant.deleteDraft(alphaWorkspaceId, betaDraftId);
    expect(deleted.count).toBe(0);

    const betaDraft = await tenant.getDraft(betaWorkspaceId, betaDraftId);
    expect(betaDraft.body).toBe('beta only');
  });

  it('still lets a workspace read its own draft', async () => {
    const own = await tenant.getDraft(alphaWorkspaceId, alphaDraftId);
    expect(own.body).toBe('alpha only');
  });
});
