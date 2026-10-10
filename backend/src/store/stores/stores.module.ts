import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../../hr/employees/employee.entity.js';
import { RegisterSession } from '../cash-register/register-session.entity.js';
import { Store } from './store.entity.js';
import { StoresController } from './stores.controller.js';
import { StoresService } from './stores.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Store, Employee, RegisterSession])],
  controllers: [StoresController],
  providers: [StoresService],
})
export class StoresModule {}
