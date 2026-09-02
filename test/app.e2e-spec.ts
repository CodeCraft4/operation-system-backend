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

  it('GET /api/v1/health/ready', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200)
      .expect({
        status: 'ready',
        checks: {
          app: 'ok',
          database: 'skipped',
          supabase: 'skipped',
          inngest: 'skipped',
        },
      });
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
