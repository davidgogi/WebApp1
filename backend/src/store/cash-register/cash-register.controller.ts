import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user.js';
import { Access, CurrentUser, Roles } from '../../auth/decorators.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { AppModuleName } from '../../companies/app-module.enum.js';
import { CashRegisterService, RegisterAvailability, SessionDetail, SessionView } from './cash-register.service.js';
import { CashMoveDto, CloseRegisterDto, CommentDto, CoverageDto, OpenRegisterDto, PeriodQuery, PinDto } from './dto/register.dto.js';

@Controller('cash-register')
@Access(AppModuleName.STORE)
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Get('pin')
  @Roles(UserRole.MANAGER, UserRole.CASHIER)
  pinStatus(@CurrentUser() user: AuthUser): Promise<{ hasPin: boolean }> {
    return this.cashRegisterService.pinStatus(user);
  }

  @Put('pin')
  @Roles(UserRole.MANAGER, UserRole.CASHIER)
  setPin(@CurrentUser() user: AuthUser, @Body() dto: PinDto): Promise<{ hasPin: boolean }> {
    return this.cashRegisterService.setPin(user, dto);
  }

  @Get('registers')
  @Roles(UserRole.MANAGER, UserRole.CASHIER)
  registers(@CurrentUser() user: AuthUser, @Query('storeId', ParseUUIDPipe) storeId: string): Promise<RegisterAvailability[]> {
    return this.cashRegisterService.registers(user, storeId);
  }

  @Get('sessions')
  findAll(@CurrentUser() user: AuthUser, @Query() query: PeriodQuery): Promise<SessionView[]> {
    return this.cashRegisterService.findAll(user, query);
  }

  @Get('sessions/current')
  @Roles(UserRole.MANAGER, UserRole.CASHIER)
  current(@CurrentUser() user: AuthUser): Promise<SessionDetail | null> {
    return this.cashRegisterService.current(user);
  }

  @Get('sessions/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<SessionDetail> {
    return this.cashRegisterService.findOne(user, id);
  }

  @Post('sessions')
  @Roles(UserRole.MANAGER, UserRole.CASHIER)
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenRegisterDto): Promise<SessionDetail> {
    return this.cashRegisterService.open(user, dto);
  }

  @Post('sessions/:id/close')
  @Roles(UserRole.MANAGER, UserRole.CASHIER)
  close(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CloseRegisterDto): Promise<SessionDetail> {
    return this.cashRegisterService.close(user, id, dto);
  }

  @Post('sessions/:id/cash-moves')
  @Roles(UserRole.MANAGER, UserRole.CASHIER)
  moveCash(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CashMoveDto): Promise<SessionDetail> {
    return this.cashRegisterService.moveCash(user, id, dto);
  }

  @Patch('sessions/:id/comment')
  @Roles(UserRole.MODULE_ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  comment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CommentDto): Promise<SessionDetail> {
    return this.cashRegisterService.comment(user, id, dto);
  }

  @Post('sessions/:id/coverages')
  @Roles(UserRole.MODULE_ADMIN, UserRole.MANAGER)
  cover(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CoverageDto): Promise<SessionDetail> {
    return this.cashRegisterService.cover(user, id, dto);
  }
}
