import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { EmployeesModule } from './employees/employees.module.js';

// HR module: groups its submodules and serves them under /hr (e.g. /hr/employees).
@Module({
  imports: [EmployeesModule, RouterModule.register([{ path: 'hr', children: [EmployeesModule] }])],
})
export class HrModule {}
