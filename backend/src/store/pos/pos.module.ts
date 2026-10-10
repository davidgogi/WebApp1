import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegisterModule } from '../cash-register/cash-register.module.js';
import { Sale } from '../cash-register/sale.entity.js';
import { SaleLine } from '../cash-register/sale-line.entity.js';
import { PosController } from './pos.controller.js';
import { PosService } from './pos.service.js';
import { StoreProduct } from './store-product.entity.js';

// POS rings up sales on the register that Cash register opened (same module, so it may use it).
@Module({
  imports: [TypeOrmModule.forFeature([StoreProduct, Sale, SaleLine]), CashRegisterModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
