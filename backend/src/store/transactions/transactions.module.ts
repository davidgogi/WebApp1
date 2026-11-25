import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleLine } from '../cash-register/sale-line.entity.js';
import { ExpensesModule } from '../expenses/expenses.module.js';
import { SalesModule } from '../sales/sales.module.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SaleLine]), SalesModule, ExpensesModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
