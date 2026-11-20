import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
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
import { CounterpartyExcelService, CounterpartyImportReport } from './counterparty-excel.service.js';
import { CounterpartyHistoryEntry, CounterpartiesService } from './counterparties.service.js';
import { Counterparty } from './counterparty.entity.js';
import { CreateCounterpartyDto, UpdateCounterpartyDto } from './dto/counterparty.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { CounterpartyDocument } from './counterparty-document.entity.js';
import {
  CounterpartyDocumentsService,
  DOCUMENT_UPLOAD,
} from './counterparty-documents.service.js';

@Controller('counterparties')
@Access('parameters')
@Roles(...ADMIN_ROLES)
export class CounterpartiesController {
  constructor(
    private readonly counterpartiesService: CounterpartiesService,
    private readonly excelService: CounterpartyExcelService,
    private readonly documentsService: CounterpartyDocumentsService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<Counterparty[]> {
    return this.counterpartiesService.findAll(user);
  }

  @Get('supplier-options')
  @Access(AppModuleName.WMS)
  @Roles(...ADMIN_ROLES, UserRole.MANAGER)
  supplierOptions(
    @CurrentUser() user: AuthUser,
  ): Promise<Pick<Counterparty, 'id' | 'name' | 'identificationCode'>[]> {
    return this.counterpartiesService.supplierOptions(user);
  }

  @Get('categories')
  categories(@CurrentUser() user: AuthUser): Promise<string[]> {
    return this.counterpartiesService.categories(user);
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

  @Get('import/example')
  async importExample(@Lang() language: Language): Promise<StreamableFile> {
    return new StreamableFile(await this.excelService.example(language), {
      type: XLSX_TYPE,
      disposition: 'attachment; filename="counterparties-example.xlsx"',
    });
  }

  @Post('import/check')
  @UseInterceptors(FileInterceptor('file', XLSX_UPLOAD))
  checkImport(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<CounterpartyImportReport> {
    return this.excelService.check(user, file);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', XLSX_UPLOAD))
  import(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<CounterpartyImportReport> {
    return this.excelService.import(user, file);
  }

  @Get(':id/history')
  history(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CounterpartyHistoryEntry[]> {
    return this.counterpartiesService.history(user, id);
  }

  @Get(':id/documents')
  documents(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CounterpartyDocument[]> {
    return this.documentsService.list(user, id);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', DOCUMENT_UPLOAD))
  uploadDocument(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDocumentDto,
  ): Promise<CounterpartyDocument> {
    return this.documentsService.upload(user, id, file, dto);
  }

  @Get(':id/documents/:documentId/file')
  @Header('X-Content-Type-Options', 'nosniff')
  async documentFile(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<StreamableFile> {
    const document = await this.documentsService.file(user, id, documentId);
    return new StreamableFile(document.content, {
      type: document.mimeType,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(document.name)}`,
    });
  }

  @Delete(':id/documents/:documentId')
  removeDocument(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<void> {
    return this.documentsService.remove(user, id, documentId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Counterparty> {
    return this.counterpartiesService.findOne(user, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCounterpartyDto,
  ): Promise<Counterparty> {
    return this.counterpartiesService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCounterpartyDto,
  ): Promise<Counterparty> {
    return this.counterpartiesService.update(user, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.counterpartiesService.remove(user, id);
  }
}
