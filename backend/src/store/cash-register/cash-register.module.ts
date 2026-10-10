import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../../hr/employees/employee.entity.js';
import { Store } from '../stores/store.entity.js';
import { CashRegisterController } from './cash-register.controller.js';
import { CashRegisterService } from './cash-register.service.js';
import { RegisterSession } from './register-session.entity.js';
import { SaleLine } from './sale-line.entity.js';
import { Sale } from './sale.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([RegisterSession, Sale, SaleLine, Store, Employee])],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
