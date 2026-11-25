import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { CashRegisterModule } from './cash-register/cash-register.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { PosModule } from './pos/pos.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { SalesModule } from './sales/sales.module.js';
import { StoresModule } from './stores/stores.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';

@Module({
  imports: [
    StoresModule,
    PosModule,
    CashRegisterModule,
    SalesModule,
    ReportsModule,
    ExpensesModule,
    TransactionsModule,
    RouterModule.register([
      { path: 'store', children: [StoresModule, PosModule, CashRegisterModule, SalesModule, ReportsModule, ExpensesModule, TransactionsModule] },
    ]),
  ],
})
export class StoreModule {}
