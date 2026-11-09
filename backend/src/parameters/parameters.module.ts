import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { PartnersModule } from './partners/partners.module.js';

@Module({
  imports: [
    PartnersModule,
    RouterModule.register([{ path: 'parameters', children: [PartnersModule] }]),
  ],
})
export class ParametersModule {}
