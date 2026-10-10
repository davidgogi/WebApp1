import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { CompaniesModule } from './companies/companies.module.js';

// The superuser's area, served under /superadmin (e.g. /superadmin/companies).
@Module({
  imports: [CompaniesModule, RouterModule.register([{ path: 'superadmin', children: [CompaniesModule] }])],
})
export class SuperadminModule {}
