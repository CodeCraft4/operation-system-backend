import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import type { Env } from './config/env';

export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService<Env, true>);
  const apiPrefix = config.get('API_PREFIX', { infer: true });
  const frontendOrigin = config.get('FRONTEND_ORIGIN', { infer: true });

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: frontendOrigin,
    credentials: true,
  });
  app.use(requestIdMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
