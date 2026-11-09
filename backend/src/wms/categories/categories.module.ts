import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/product.entity.js';
import { Category } from './category.entity.js';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { ProductGroup } from './product-group.entity.js';
import { ProductGroupsController } from './product-groups.controller.js';
import { ProductGroupsService } from './product-groups.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Category, ProductGroup, Product])],
  controllers: [CategoriesController, ProductGroupsController],
  providers: [CategoriesService, ProductGroupsService],
})
export class CategoriesModule {}
