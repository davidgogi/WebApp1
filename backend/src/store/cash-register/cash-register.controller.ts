import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user.js';
import { Access, CurrentUser, Roles } from '../../auth/decorators.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { AppModuleName } from '../../companies/app-module.enum.js';
import { CashRegisterService, SessionDetail, SessionView } from './cash-register.service.js';
import { CloseRegisterDto, OpenRegisterDto } from './dto/register.dto.js';

// Everyone in Store can look (each sees their own slice); only managers and cashiers operate.
@Controller('cash-register')
@Access(AppModuleName.STORE)
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  // The registers of one of my stores, and who has each one open. Feeds the "open register" form.
  @Get('registers')
  @Roles(UserRole.MANAGER, UserRole.CASHIER)
  registers(@CurrentUser() user: AuthUser, @Query('storeId') storeId: string): Promise<{ no: number; inUseBy: string | null }[]> {
    return this.cashRegisterService.registers(user, storeId);
  }

  @Get('sessions')
  findAll(@CurrentUser() user: AuthUser): Promise<SessionView[]> {
    return this.cashRegisterService.findAll(user);
  }

  @Get('sessions/current')
  @Roles(UserRole.MANAGER, UserRole.CASHIER)
  current(@CurrentUser() user: AuthUser): Promise<SessionView | null> {
    return this.cashRegisterService.current(user);
  }

  @Get('sessions/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<SessionDetail> {
    return this.cashRegisterService.findOne(user, id);
  }

  @Post('sessions')
  @Roles(UserRole.MANAGER, UserRole.CASHIER)
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenRegisterDto): Promise<SessionView> {
    return this.cashRegisterService.open(user, dto);
  }

  @Post('sessions/:id/close')
  @Roles(UserRole.MANAGER, UserRole.CASHIER)
  close(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CloseRegisterDto): Promise<SessionView> {
    return this.cashRegisterService.close(user, id, dto);
  }
}
