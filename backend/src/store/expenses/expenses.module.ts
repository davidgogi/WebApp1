import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Counterparty } from '../../parameters/counterparties/counterparty.entity.js';
import { CashRegisterModule } from '../cash-register/cash-register.module.js';
import { Store } from '../stores/store.entity.js';
import { BankAccount } from './bank-account.entity.js';
import { ExpenseCategory } from './expense-category.entity.js';
import { ExpenseType } from './expense-type.entity.js';
import { Expense } from './expense.entity.js';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, ExpenseCategory, ExpenseType, BankAccount, Store, Counterparty]),
    CashRegisterModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
