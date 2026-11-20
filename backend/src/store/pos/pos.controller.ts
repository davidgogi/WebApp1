import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user.js';
import { Access, CurrentUser, Roles } from '../../auth/decorators.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { AppModuleName } from '../../companies/app-module.enum.js';
import { CreateSaleDto } from '../sales/dto/sale.dto.js';
import { SaleDetail } from '../sales/sales.service.js';
import { PosCatalog, PosService } from './pos.service.js';

@Controller('pos')
@Access(AppModuleName.STORE)
@Roles(UserRole.MANAGER, UserRole.CASHIER)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('catalog')
  catalog(@CurrentUser() user: AuthUser): Promise<PosCatalog> {
    return this.posService.catalog(user);
  }

  @Post('sales')
  sell(@CurrentUser() user: AuthUser, @Body() dto: CreateSaleDto): Promise<SaleDetail> {
    return this.posService.sell(user, dto);
  }
}
