import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../auth/user.entity.js';
import { Expense } from '../expenses/expense.entity.js';
import { StoreEmployee } from '../stores/store-employee.entity.js';
import { Store } from '../stores/store.entity.js';
import { CashRegisterController } from './cash-register.controller.js';
import { CashRegisterService } from './cash-register.service.js';
import { RegisterCashMove } from './register-cash-move.entity.js';
import { RegisterSession } from './register-session.entity.js';
import { SaleLine } from './sale-line.entity.js';
import { Sale } from './sale.entity.js';
import { ShortageCoverage } from './shortage-coverage.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegisterSession, RegisterCashMove, ShortageCoverage, Expense, Sale, SaleLine, Store, StoreEmployee, User]),
  ],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
