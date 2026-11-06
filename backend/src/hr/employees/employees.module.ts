import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseEmployee } from '../../wms/warehouses/warehouse-employee.entity.js';
import { Warehouse } from '../../wms/warehouses/warehouse.entity.js';
import { StoreEmployee } from '../../store/stores/store-employee.entity.js';
import { Store } from '../../store/stores/store.entity.js';
import { User } from '../../auth/user.entity.js';
import { Employee } from './employee.entity.js';
import { EmployeesService } from './employees.service.js';
import { EmployeesController } from './employees.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, User, Store, StoreEmployee, Warehouse, WarehouseEmployee])],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
