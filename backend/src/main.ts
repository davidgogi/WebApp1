import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { TranslateExceptionFilter } from './common/i18n/translate.filter.js';
import { TranslateReportInterceptor } from './common/i18n/translate.interceptor.js';

// Outside local development the built-in fallbacks (secret, superuser password) must not be used.
if (process.env.NODE_ENV === 'production') {
  const missing = ['AUTH_SECRET', 'SUPERUSER_PASSWORD'].filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Comma-separated list. Not needed when the frontend proxies /api (same origin), as in deploy/.
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:4200').split(',').map((o) => o.trim());
  app.enableCors({ origin: origins });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new TranslateExceptionFilter());
  app.useGlobalInterceptors(new TranslateReportInterceptor());
  // Kubernetes stops a pod with SIGTERM: close the database connections cleanly.
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
