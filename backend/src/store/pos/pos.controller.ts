import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user.js';
import { Access, CurrentUser, Roles } from '../../auth/decorators.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { AppModuleName } from '../../companies/app-module.enum.js';
import { Sale } from '../cash-register/sale.entity.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { PosService } from './pos.service.js';
import { StoreProduct } from './store-product.entity.js';

@Controller('pos')
@Access(AppModuleName.STORE)
@Roles(UserRole.MANAGER, UserRole.CASHIER)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('products')
  products(@CurrentUser() user: AuthUser): Promise<StoreProduct[]> {
    return this.posService.products(user);
  }

  @Post('sales')
  createSale(@CurrentUser() user: AuthUser, @Body() dto: CreateSaleDto): Promise<Sale> {
    return this.posService.createSale(user, dto);
  }
}
