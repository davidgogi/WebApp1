import { Controller, Get, Param, ParseUUIDPipe, Query, StreamableFile } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user.js';
import { Access, CurrentUser, Roles } from '../../auth/decorators.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { Lang, type Language } from '../../common/i18n/translate.js';
import { XLSX_TYPE } from '../../common/xlsx.js';
import { AppModuleName } from '../../companies/app-module.enum.js';
import { PeriodQuery } from '../cash-register/dto/register.dto.js';
import { DailyReport, ReportsService } from './reports.service.js';

@Controller('reports')
@Access(AppModuleName.STORE)
@Roles(UserRole.SYSTEM_ADMIN, UserRole.MODULE_ADMIN, UserRole.MANAGER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  daily(@CurrentUser() user: AuthUser, @Query() query: PeriodQuery): Promise<DailyReport> {
    return this.reportsService.daily(user, query);
  }

  @Get('daily/export')
  async dailyExport(@CurrentUser() user: AuthUser, @Query() query: PeriodQuery, @Lang() language: Language): Promise<StreamableFile> {
    return new StreamableFile(await this.reportsService.dailyExport(user, query, language), {
      type: XLSX_TYPE,
      disposition: 'attachment; filename="daily-sales.xlsx"',
    });
  }

  @Get('cash-movement/:sessionId/export')
  async cashMovementExport(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Lang() language: Language,
  ): Promise<StreamableFile> {
    return new StreamableFile(await this.reportsService.cashMovementExport(user, sessionId, language), {
      type: XLSX_TYPE,
      disposition: 'attachment; filename="cash-movement.xlsx"',
    });
  }
}
