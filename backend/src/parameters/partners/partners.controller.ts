import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthUser } from '../../auth/auth-user.js';
import { Access, CurrentUser, Roles } from '../../auth/decorators.js';
import { ADMIN_ROLES, UserRole } from '../../auth/user-role.enum.js';
import { AppModuleName } from '../../companies/app-module.enum.js';
import { Lang } from '../../common/i18n/translate.js';
import type { Language } from '../../common/i18n/translate.js';
import { XLSX_TYPE, XLSX_UPLOAD } from '../../common/xlsx.js';
import { PartnerExcelService, PartnerImportReport } from './partner-excel.service.js';
import { PartnersService } from './partners.service.js';
import { Partner } from './partner.entity.js';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto.js';

@Controller('partners')
@Access('parameters')
@Roles(...ADMIN_ROLES)
export class PartnersController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly excelService: PartnerExcelService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<Partner[]> {
    return this.partnersService.findAll(user);
  }

  @Get('supplier-options')
  @Access(AppModuleName.WMS)
  @Roles(...ADMIN_ROLES, UserRole.MANAGER)
  supplierOptions(
    @CurrentUser() user: AuthUser,
  ): Promise<Pick<Partner, 'id' | 'name' | 'identificationCode'>[]> {
    return this.partnersService.supplierOptions(user);
  }

  @Get('export')
  async export(
    @CurrentUser() user: AuthUser,
    @Lang() language: Language,
  ): Promise<StreamableFile> {
    return new StreamableFile(await this.excelService.export(user, language), {
      type: XLSX_TYPE,
      disposition: 'attachment; filename="counterparties.xlsx"',
    });
  }

  @Get('import/template')
  async importTemplate(@Lang() language: Language): Promise<StreamableFile> {
    return new StreamableFile(await this.excelService.template(language), {
      type: XLSX_TYPE,
      disposition: 'attachment; filename="counterparties-template.xlsx"',
    });
  }

  @Post('import/check')
  @UseInterceptors(FileInterceptor('file', XLSX_UPLOAD))
  checkImport(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<PartnerImportReport> {
    return this.excelService.check(user, file);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', XLSX_UPLOAD))
  import(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<PartnerImportReport> {
    return this.excelService.import(user, file);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePartnerDto,
  ): Promise<Partner> {
    return this.partnersService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
  ): Promise<Partner> {
    return this.partnersService.update(user, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.partnersService.remove(user, id);
  }
}
