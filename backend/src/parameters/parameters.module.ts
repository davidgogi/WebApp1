import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { CounterpartiesModule } from './counterparties/counterparties.module.js';

@Module({
  imports: [
    CounterpartiesModule,
    RouterModule.register([{ path: 'parameters', children: [CounterpartiesModule] }]),
  ],
})
export class ParametersModule {}
