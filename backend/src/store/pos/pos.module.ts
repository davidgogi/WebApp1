import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../wms/products/product.entity.js';
import { ProductWarehouse } from '../../wms/stock/product-warehouse.entity.js';
import { CashRegisterModule } from '../cash-register/cash-register.module.js';
import { SalesModule } from '../sales/sales.module.js';
import { PosController } from './pos.controller.js';
import { PosService } from './pos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductWarehouse]), CashRegisterModule, SalesModule],
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}
