import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { configureApp } from './../src/configure-app';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/health', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /api/v1/health/ready', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);

    expect(response.body.checks.app).toBe('ok');
    expect(response.body.checks.inngest).toBe('skipped');
    expect(['ok', 'skipped', 'error']).toContain(response.body.checks.database);
    expect(['ok', 'skipped', 'error']).toContain(response.body.checks.supabase);
    expect(['ok', 'skipped', 'error']).toContain(response.body.checks.deepseek);
    expect(['ok', 'skipped', 'error']).toContain(response.body.checks.retell);
    expect(['ok', 'skipped', 'error']).toContain(response.body.checks.email);
    expect(['ready', 'degraded']).toContain(response.body.status);
  });

  it('GET /api/v1/jobs/inngest', () => {
    return request(app.getHttpServer())
      .get('/api/v1/jobs/inngest')
      .expect(200)
      .expect({
        status: 'skipped',
        message: 'Inngest is not connected yet. No events will be sent.',
      });
  });
});
