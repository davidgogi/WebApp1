import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user.js';
import { Access, CurrentUser, Roles } from '../../auth/decorators.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { AppModuleName } from '../../companies/app-module.enum.js';
import {
  CreateProductGroupDto,
  DeleteProductGroupDto,
  UpdateProductGroupDto,
} from './dto/product-group.dto.js';
import { ProductGroup } from './product-group.entity.js';
import { ProductGroupsService } from './product-groups.service.js';

@Controller('categories/:categoryId/groups')
@Access(AppModuleName.WMS)
@Roles(UserRole.MODULE_ADMIN)
export class ProductGroupsController {
  constructor(private readonly groupsService: ProductGroupsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateProductGroupDto,
  ): Promise<ProductGroup> {
    return this.groupsService.create(user, categoryId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('categoryId') categoryId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductGroupDto,
  ): Promise<ProductGroup> {
    return this.groupsService.update(user, categoryId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('categoryId') categoryId: string,
    @Param('id') id: string,
    @Query() dto: DeleteProductGroupDto,
  ): Promise<void> {
    return this.groupsService.remove(user, categoryId, id, dto);
  }
}
