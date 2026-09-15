import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';

const VALID_TOKEN = 'valid-alpha-token';
const ALPHA_EMAIL = 'operator.alpha@pilot.local';

describe('Identity (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let previousAuthId: string | null;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue({
        check: () => Promise.resolve('ok'),
        getUserFromAccessToken: (token: string) => {
          if (token === VALID_TOKEN) {
            return Promise.resolve({
              id: 'sb-auth-alpha',
              email: ALPHA_EMAIL,
            });
          }
          return Promise.resolve(null);
        },
        signInWithPassword: (email: string, password: string) => {
          if (email === ALPHA_EMAIL && password === 'correct-password') {
            return Promise.resolve({
              access_token: VALID_TOKEN,
              expires_in: 3600,
              user: { id: 'sb-auth-alpha', email: ALPHA_EMAIL },
            });
          }
          return Promise.resolve(null);
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const alpha = await prisma.db.user.findUnique({
      where: { email: ALPHA_EMAIL },
    });
    if (!alpha) {
      throw new Error('Seed workspaces are missing. Run npm run prisma:seed.');
    }
    previousAuthId = alpha.supabaseAuthId;
  });

  afterAll(async () => {
    try {
      await prisma.db.user.update({
        where: { email: ALPHA_EMAIL },
        data: { supabaseAuthId: previousAuthId },
      });
    } finally {
      await app.close();
    }
  });

  it('still allows health checks without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('rejects GET /me when the token is missing', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .expect(401);

    expect(response.body).toMatchObject({ statusCode: 401 });
  });

  it('rejects GET /me when the token is invalid', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);

    expect(response.body).toMatchObject({ statusCode: 401 });
  });

  it('returns the current user and workspace for a valid token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .expect(200);

    expect(response.body).toMatchObject({
      user: { email: ALPHA_EMAIL },
      workspace: { slug: 'pilot-alpha', role: 'operator' },
    });
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ALPHA_EMAIL, password: 'wrong-password' })
      .expect(401);
  });

  it('returns an access token for a valid login', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ALPHA_EMAIL, password: 'correct-password' })
      .expect(200);

    expect(response.body).toMatchObject({
      accessToken: VALID_TOKEN,
      tokenType: 'Bearer',
    });
  });

  it('rejects a workspace the signed-in user does not belong to', async () => {
    const beta = await prisma.db.workspace.findUnique({
      where: { slug: 'pilot-beta' },
    });
    if (!beta) {
      throw new Error('Seed workspaces are missing. Run npm run prisma:seed.');
    }

    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .set('x-workspace-id', beta.id)
      .expect(403);
  });
});
