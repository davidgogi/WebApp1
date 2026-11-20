import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegisterModule } from '../cash-register/cash-register.module.js';
import { RegisterCashMove } from '../cash-register/register-cash-move.entity.js';
import { Sale } from '../cash-register/sale.entity.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, RegisterCashMove]), CashRegisterModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
