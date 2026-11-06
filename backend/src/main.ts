import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { TranslateExceptionFilter } from './common/i18n/translate.filter.js';
import { runInRequestScope } from './database/tenant-scope.js';
import { TranslateReportInterceptor } from './common/i18n/translate.interceptor.js';

if (process.env.NODE_ENV === 'production') {
  const missing = ['AUTH_SECRET', 'SUPERUSER_PASSWORD', 'DB_PASSWORD'].filter(
    (name) => !process.env[name],
  );
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

if (process.env.DB_CONNECT_AS_OWNER) {
  throw new Error(
    'DB_CONNECT_AS_OWNER is only for data:export / data:import, not the running app',
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use((_request: unknown, _response: unknown, next: () => void) => {
    return runInRequestScope(next);
  });
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: origins });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new TranslateExceptionFilter());
  app.useGlobalInterceptors(new TranslateReportInterceptor());
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
