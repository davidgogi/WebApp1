import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user.js';
import { Access, CurrentUser, Roles } from '../../auth/decorators.js';
import { ADMIN_ROLES, UserRole } from '../../auth/user-role.enum.js';
import { AppModuleName } from '../../companies/app-module.enum.js';
import { PartnersService } from './partners.service.js';
import { Partner } from './partner.entity.js';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto.js';

@Controller('partners')
@Access('parameters')
@Roles(...ADMIN_ROLES)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

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
