import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse } from '../../wms/warehouses/warehouse.entity.js';
import { Store } from '../../store/stores/store.entity.js';
import { User } from '../../auth/user.entity.js';
import { Employee } from './employee.entity.js';
import { EmployeesService } from './employees.service.js';
import { EmployeesController } from './employees.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, User, Store, Warehouse])],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
