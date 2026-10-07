import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './employee.entity.js';
import { EmployeesService } from './employees.service.js';
import { EmployeesController } from './employees.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Employee])],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
