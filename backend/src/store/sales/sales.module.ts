import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockModule } from '../../wms/stock/stock.module.js';
import { CashRegisterModule } from '../cash-register/cash-register.module.js';
import { SaleLine } from '../cash-register/sale-line.entity.js';
import { Sale } from '../cash-register/sale.entity.js';
import { SalesController } from './sales.controller.js';
import { SalesService } from './sales.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleLine]), CashRegisterModule, StockModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
