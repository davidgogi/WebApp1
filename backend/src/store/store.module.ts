import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { CashRegisterModule } from './cash-register/cash-register.module.js';
import { PosModule } from './pos/pos.module.js';
import { StoresModule } from './stores/stores.module.js';

// Store module: serves its submodules under /store (e.g. /store/pos). "Recording an expense"
// is still a frontend-only shell, so it has no backend part yet.
@Module({
  imports: [
    StoresModule,
    PosModule,
    CashRegisterModule,
    RouterModule.register([{ path: 'store', children: [StoresModule, PosModule, CashRegisterModule] }]),
  ],
})
export class StoreModule {}
