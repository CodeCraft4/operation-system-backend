import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import {
  GenerationProviderError,
  TEXT_GENERATION_PROVIDER,
} from '../src/content/generation/text-generation.types';
import { StubTextGenerationProvider } from '../src/content/generation/stub-text-generation.provider';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';

const ALPHA_TOKEN = 'valid-alpha-token';
const BETA_TOKEN = 'valid-beta-token';
const ALPHA_EMAIL = 'operator.alpha@pilot.local';
const BETA_EMAIL = 'operator.beta@pilot.local';

type SubmitResponse = {
  request: {
    id: string;
    workspaceId: string;
    createdByUserId: string | null;
    idempotencyKey: string | null;
  };
  job: {
    id: string;
    status: string;
    provider: string;
    startedAt: string | null;
    completedAt: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    draftId: string | null;
  } | null;
  draft: {
    id: string;
    body: string;
    version: number;
    workspaceId: string;
  } | null;
};

describe('Content generation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let alphaWorkspaceId: string;
  let betaWorkspaceId: string;
  let alphaUserId: string;
  const createdRequestIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue({
        check: () => Promise.resolve('ok'),
        getUserFromAccessToken: (token: string) => {
          if (token === ALPHA_TOKEN) {
            return Promise.resolve({
              id: 'sb-auth-alpha',
              email: ALPHA_EMAIL,
            });
          }
          if (token === BETA_TOKEN) {
            return Promise.resolve({
              id: 'sb-auth-beta',
              email: BETA_EMAIL,
            });
          }
          return Promise.resolve(null);
        },
      })
      .overrideProvider(TEXT_GENERATION_PROVIDER)
      .useClass(StubTextGenerationProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const alphaUser = await prisma.db.user.findUnique({
      where: { email: ALPHA_EMAIL },
    });
    const betaUser = await prisma.db.user.findUnique({
      where: { email: BETA_EMAIL },
    });
    const alpha = await prisma.db.workspace.findUnique({
      where: { slug: 'pilot-alpha' },
    });
    const beta = await prisma.db.workspace.findUnique({
      where: { slug: 'pilot-beta' },
    });

    if (!alphaUser || !betaUser || !alpha || !beta) {
      throw new Error('Seed data is missing. Run npm run prisma:seed.');
    }

    alphaUserId = alphaUser.id;
    alphaWorkspaceId = alpha.id;
    betaWorkspaceId = beta.id;

    await prisma.db.user.update({
      where: { id: alphaUser.id },
      data: { currentWorkspaceId: alpha.id },
    });
    await prisma.db.user.update({
      where: { id: betaUser.id },
      data: { currentWorkspaceId: beta.id },
    });
  });

  afterAll(async () => {
    try {
      if (createdRequestIds.length > 0) {
        await prisma.db.contentDraft.deleteMany({
          where: { contentRequestId: { in: createdRequestIds } },
        });
        await prisma.db.generationJob.deleteMany({
          where: { contentRequestId: { in: createdRequestIds } },
        });
        await prisma.db.contentRequest.deleteMany({
          where: { id: { in: createdRequestIds } },
        });
      }
    } finally {
      await app.close();
    }
  });

  function track(body: SubmitResponse) {
    if (body.request?.id) {
      createdRequestIds.push(body.request.id);
    }
  }

  function asSubmit(body: unknown): SubmitResponse {
    return body as SubmitResponse;
  }

  it('rejects unauthenticated content submissions', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/content/requests')
      .send({ topic: 'Nope' })
      .expect(401);
  });

  it('generates a draft with stub provider and correct job transitions', async () => {
    const idempotencyKey = `e2e-success-${Date.now()}`;
    const response = await request(app.getHttpServer())
      .post('/api/v1/content/requests')
      .set('Authorization', `Bearer ${ALPHA_TOKEN}`)
      .set('x-workspace-id', alphaWorkspaceId)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        topic: 'Spring campaign',
        audience: 'operators',
        format: 'email',
      })
      .expect(200);

    const created = asSubmit(response.body);
    track(created);
    expect(created.request.workspaceId).toBe(alphaWorkspaceId);
    expect(created.request.createdByUserId).toBe(alphaUserId);
    expect(created.request.idempotencyKey).toBe(idempotencyKey);
    expect(created.job?.status).toBe('succeeded');
    expect(created.job?.provider).toBe('stub');
    expect(created.job?.startedAt).toBeTruthy();
    expect(created.job?.completedAt).toBeTruthy();
    expect(created.draft?.body).toContain('Spring campaign');
    expect(created.draft?.version).toBe(1);

    const job = await request(app.getHttpServer())
      .get(`/api/v1/content/jobs/${created.job!.id}`)
      .set('Authorization', `Bearer ${ALPHA_TOKEN}`)
      .set('x-workspace-id', alphaWorkspaceId)
      .expect(200);
    const jobBody = job.body as { status: string; draftId: string | null };
    expect(jobBody.status).toBe('succeeded');
    expect(jobBody.draftId).toBe(created.draft!.id);

    const draft = await request(app.getHttpServer())
      .get(`/api/v1/content/drafts/${created.draft!.id}`)
      .set('Authorization', `Bearer ${ALPHA_TOKEN}`)
      .set('x-workspace-id', alphaWorkspaceId)
      .expect(200);
    expect((draft.body as { id: string }).id).toBe(created.draft!.id);

    const listed = await request(app.getHttpServer())
      .get('/api/v1/content/drafts')
      .set('Authorization', `Bearer ${ALPHA_TOKEN}`)
      .set('x-workspace-id', alphaWorkspaceId)
      .expect(200);
    expect(
      (listed.body as Array<{ id: string }>).some(
        (item) => item.id === created.draft!.id,
      ),
    ).toBe(true);
  });

  it('returns the same request/job/draft for repeated idempotency keys', async () => {
    const idempotencyKey = `e2e-idem-${Date.now()}`;
    const firstResponse = await request(app.getHttpServer())
      .post('/api/v1/content/requests')
      .set('Authorization', `Bearer ${ALPHA_TOKEN}`)
      .set('x-workspace-id', alphaWorkspaceId)
      .set('Idempotency-Key', idempotencyKey)
      .send({ topic: 'Idempotent topic' })
      .expect(200);
    const first = asSubmit(firstResponse.body);
    track(first);

    const secondResponse = await request(app.getHttpServer())
      .post('/api/v1/content/requests')
      .set('Authorization', `Bearer ${ALPHA_TOKEN}`)
      .set('x-workspace-id', alphaWorkspaceId)
      .set('Idempotency-Key', idempotencyKey)
      .send({ topic: 'Idempotent topic' })
      .expect(200);
    const second = asSubmit(secondResponse.body);

    expect(second.request.id).toBe(first.request.id);
    expect(second.job?.id).toBe(first.job?.id);
    expect(second.draft?.id).toBe(first.draft?.id);

    const draftCount = await prisma.db.contentDraft.count({
      where: { contentRequestId: first.request.id },
    });
    expect(draftCount).toBe(1);
  });

  it('creates only one draft under concurrent duplicate submissions', async () => {
    const idempotencyKey = `e2e-concurrent-${Date.now()}`;
    const payload = {
      topic: 'Concurrent topic',
      audience: 'qa',
    };

    const [aRes, bRes] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/content/requests')
        .set('Authorization', `Bearer ${ALPHA_TOKEN}`)
        .set('x-workspace-id', alphaWorkspaceId)
        .set('Idempotency-Key', idempotencyKey)
        .send(payload),
      request(app.getHttpServer())
        .post('/api/v1/content/requests')
        .set('Authorization', `Bearer ${ALPHA_TOKEN}`)
        .set('x-workspace-id', alphaWorkspaceId)
        .set('Idempotency-Key', idempotencyKey)
        .send(payload),
    ]);

    expect(aRes.status).toBe(200);
    expect(bRes.status).toBe(200);
    const a = asSubmit(aRes.body);
    const b = asSubmit(bRes.body);
    track(a);
    track(b);

    expect(a.request.id).toBe(b.request.id);
    expect(a.draft?.id).toBe(b.draft?.id);

    const draftCount = await prisma.db.contentDraft.count({
      where: { contentRequestId: a.request.id },
    });
    const jobCount = await prisma.db.generationJob.count({
      where: { contentRequestId: a.request.id },
    });
    expect(draftCount).toBe(1);
    expect(jobCount).toBe(1);
  });

  it('denies cross-workspace job and draft access', async () => {
    const createdResponse = await request(app.getHttpServer())
      .post('/api/v1/content/requests')
      .set('Authorization', `Bearer ${ALPHA_TOKEN}`)
      .set('x-workspace-id', alphaWorkspaceId)
      .set('Idempotency-Key', `e2e-isolation-${Date.now()}`)
      .send({ topic: 'Alpha only' })
      .expect(200);
    const created = asSubmit(createdResponse.body);
    track(created);

    await request(app.getHttpServer())
      .get(`/api/v1/content/jobs/${created.job!.id}`)
      .set('Authorization', `Bearer ${BETA_TOKEN}`)
      .set('x-workspace-id', betaWorkspaceId)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/content/drafts/${created.draft!.id}`)
      .set('Authorization', `Bearer ${BETA_TOKEN}`)
      .set('x-workspace-id', betaWorkspaceId)
      .expect(404);

    const betaList = await request(app.getHttpServer())
      .get('/api/v1/content/drafts')
      .set('Authorization', `Bearer ${BETA_TOKEN}`)
      .set('x-workspace-id', betaWorkspaceId)
      .expect(200);
    expect(
      (betaList.body as Array<{ workspaceId: string }>).every(
        (item) => item.workspaceId === betaWorkspaceId,
      ),
    ).toBe(true);
  });

  it('persists failed jobs with safe errors and no duplicate draft', async () => {
    const failingModule: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue({
        check: () => Promise.resolve('ok'),
        getUserFromAccessToken: (token: string) => {
          if (token === ALPHA_TOKEN) {
            return Promise.resolve({
              id: 'sb-auth-alpha',
              email: ALPHA_EMAIL,
            });
          }
          return Promise.resolve(null);
        },
      })
      .overrideProvider(TEXT_GENERATION_PROVIDER)
      .useValue({
        name: 'deepseek',
        generate: () =>
          Promise.reject(
            new GenerationProviderError(
              'provider_timeout',
              'DeepSeek request timed out.',
              new Error('sk-secret-should-never-appear'),
            ),
          ),
      })
      .compile();

    const failingApp = failingModule.createNestApplication();
    configureApp(failingApp);
    await failingApp.init();

    try {
      const idempotencyKey = `e2e-fail-${Date.now()}`;
      const response = await request(
        // Nest getHttpServer() is typed loosely in this codebase.
        failingApp.getHttpServer() as Parameters<typeof request>[0],
      )
        .post('/api/v1/content/requests')
        .set('Authorization', `Bearer ${ALPHA_TOKEN}`)
        .set('x-workspace-id', alphaWorkspaceId)
        .set('Idempotency-Key', idempotencyKey)
        .send({ topic: 'Will fail' })
        .expect(200);

      const failed = asSubmit(response.body);
      track(failed);
      expect(failed.job?.status).toBe('failed');
      expect(failed.job?.errorCode).toBe('provider_timeout');
      expect(failed.job?.errorMessage).toBe('DeepSeek request timed out.');
      expect(JSON.stringify(failed)).not.toContain('sk-secret');
      expect(failed.draft).toBeNull();

      const retryResponse = await request(
        failingApp.getHttpServer() as Parameters<typeof request>[0],
      )
        .post('/api/v1/content/requests')
        .set('Authorization', `Bearer ${ALPHA_TOKEN}`)
        .set('x-workspace-id', alphaWorkspaceId)
        .set('Idempotency-Key', idempotencyKey)
        .send({ topic: 'Will fail' })
        .expect(200);
      const retry = asSubmit(retryResponse.body);

      expect(retry.request.id).toBe(failed.request.id);
      expect(retry.job?.id).toBe(failed.job?.id);
      expect(retry.draft).toBeNull();

      const draftCount = await prisma.db.contentDraft.count({
        where: { contentRequestId: failed.request.id },
      });
      expect(draftCount).toBe(0);
    } finally {
      await failingApp.close();
    }
  });
});
