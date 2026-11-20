import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Receipt } from '../../wms/receipts/receipt.entity.js';
import { Product } from '../../wms/products/product.entity.js';
import { CounterpartyContact } from './counterparty-contact.entity.js';
import { CounterpartyDocument } from './counterparty-document.entity.js';
import { CounterpartyDocumentsService } from './counterparty-documents.service.js';
import { Counterparty } from './counterparty.entity.js';
import { CounterpartiesController } from './counterparties.controller.js';
import { CounterpartiesService } from './counterparties.service.js';
import { CounterpartyExcelService } from './counterparty-excel.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Counterparty, CounterpartyContact, CounterpartyDocument, Product, Receipt])],
  controllers: [CounterpartiesController],
  providers: [CounterpartiesService, CounterpartyExcelService, CounterpartyDocumentsService],
  exports: [CounterpartiesService],
})
export class CounterpartiesModule {}
