import { Controller, Get, Query } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user.js';
import { Access, CurrentUser } from '../../auth/decorators.js';
import { AppModuleName } from '../../companies/app-module.enum.js';
import { PeriodQuery } from '../cash-register/dto/register.dto.js';
import { OperationRow, TransactionRow, TransactionsService } from './transactions.service.js';

@Controller('transactions')
@Access(AppModuleName.STORE)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  transactions(@CurrentUser() user: AuthUser, @Query() query: PeriodQuery): Promise<TransactionRow[]> {
    return this.transactionsService.transactions(user, query);
  }

  @Get('operations')
  operations(@CurrentUser() user: AuthUser, @Query() query: PeriodQuery): Promise<OperationRow[]> {
    return this.transactionsService.operations(user, query);
  }
}
