import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { CashRegisterModule } from './cash-register/cash-register.module.js';
import { PosModule } from './pos/pos.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { SalesModule } from './sales/sales.module.js';
import { StoresModule } from './stores/stores.module.js';

@Module({
  imports: [
    StoresModule,
    PosModule,
    CashRegisterModule,
    SalesModule,
    ReportsModule,
    RouterModule.register([
      { path: 'store', children: [StoresModule, PosModule, CashRegisterModule, SalesModule, ReportsModule] },
    ]),
  ],
})
export class StoreModule {}
