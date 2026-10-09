import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { EmployeesModule } from './employees/employees.module.js';

@Module({
  imports: [
    EmployeesModule,
    RouterModule.register([{ path: 'hr', children: [EmployeesModule] }]),
  ],
})
export class HrModule {}
