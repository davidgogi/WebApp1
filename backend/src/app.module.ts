import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import {
  deriveAppPassword,
  installTenantSetting,
  prepareDatabase,
} from './database/row-level-security.js';
import { migrateDatabase } from './database/schema.js';
import { HrModule } from './hr/hr.module.js';
import { StoreModule } from './store/store.module.js';
import { SuperadminModule } from './superadmin/superadmin.module.js';
import { WmsModule } from './wms/wms.module.js';
import { RsModule } from './rs/rs.module.js';
import { ParametersModule } from './parameters/parameters.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const owner = {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT'),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_DATABASE'),
        };
        installTenantSetting();
        await migrateDatabase(owner);
        if (config.get<string>('DB_CONNECT_AS_OWNER') === 'true') {
          return { ...owner, autoLoadEntities: true, synchronize: false };
        }
        const appUser = config.get<string>('DB_APP_USERNAME') ?? 'webapp_app';
        const appPassword =
          config.get<string>('DB_APP_PASSWORD') ??
          deriveAppPassword(owner.password ?? '');
        await prepareDatabase(owner, appUser, appPassword);
        return {
          ...owner,
          username: appUser,
          password: appPassword,
          autoLoadEntities: true,
          synchronize: false,
        };
      },
    }),
    AuditModule,
    AuthModule,
    SuperadminModule,
    HrModule,
    RsModule,
    ParametersModule,
    WmsModule,
    StoreModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
