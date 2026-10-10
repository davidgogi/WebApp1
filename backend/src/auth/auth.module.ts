import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { UsersService } from './users.service.js';
import { User } from './user.entity.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [AuthService, UsersService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService, UsersService, TypeOrmModule],
})
export class AuthModule {}
