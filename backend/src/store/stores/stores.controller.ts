import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user.js';
import { Access, CurrentUser, Roles } from '../../auth/decorators.js';
import { ADMIN_ROLES } from '../../auth/user-role.enum.js';
import { AppModuleName } from '../../companies/app-module.enum.js';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto.js';
import { PersonRef, StoresService, StoreView } from './stores.service.js';

// Admins manage stores; managers and cashiers only see the ones they belong to.
@Controller('stores')
@Access(AppModuleName.STORE)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<StoreView[]> {
    return this.storesService.findAll(user);
  }

  @Get('options')
  @Roles(...ADMIN_ROLES)
  options(@CurrentUser() user: AuthUser): Promise<{ managers: PersonRef[] }> {
    return this.storesService.options(user);
  }

  @Post()
  @Roles(...ADMIN_ROLES)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStoreDto): Promise<StoreView> {
    return this.storesService.create(user, dto);
  }

  @Patch(':id')
  @Roles(...ADMIN_ROLES)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateStoreDto): Promise<StoreView> {
    return this.storesService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.storesService.remove(user, id);
  }
}
