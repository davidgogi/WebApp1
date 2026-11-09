import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Receipt } from '../../wms/receipts/receipt.entity.js';
import { Product } from '../../wms/products/product.entity.js';
import { Partner } from './partner.entity.js';
import { PartnersController } from './partners.controller.js';
import { PartnersService } from './partners.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Partner, Product, Receipt])],
  controllers: [PartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
