import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user.js';
import { Access, CurrentUser, Roles } from '../../auth/decorators.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { AppModuleName } from '../../companies/app-module.enum.js';
import { PeriodQuery } from '../cash-register/dto/register.dto.js';
import { CreateReturnDto } from './dto/sale.dto.js';
import { SaleDetail, SaleListItem, SalesService } from './sales.service.js';

@Controller('sales')
@Access(AppModuleName.STORE)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PeriodQuery): Promise<SaleListItem[]> {
    return this.salesService.findAll(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<SaleDetail> {
    return this.salesService.findOne(user, id);
  }

  @Post(':id/returns')
  @Roles(UserRole.MANAGER)
  returnSale(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateReturnDto): Promise<SaleDetail> {
    return this.salesService.returnSale(user, id, dto);
  }
}
