import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service.js';
import { AuthUser } from '../../auth/auth-user.js';
import { nameKey, nameKeySql } from '../../common/name-key.js';
import { Product } from '../products/product.entity.js';
import { CategoryStatus } from './category-status.enum.js';
import { Category } from './category.entity.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';
import { DeleteCategoryDto } from './dto/product-group.dto.js';
import { ProductGroup } from './product-group.entity.js';
import { ProductGroupsService } from './product-groups.service.js';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductGroup)
    private readonly groupsRepository: Repository<ProductGroup>,
    private readonly groupsService: ProductGroupsService,
    private readonly audit: AuditService,
  ) {}

  async findAll(actor: AuthUser): Promise<Category[]> {
    const categories = await this.categoriesRepository.find({
      where: { companyId: actor.companyId! },
      order: { name: 'ASC' },
    });
    const counts: { categoryId: string; count: string }[] =
      await this.productsRepository
        .createQueryBuilder('product')
        .select('product.category_id', 'categoryId')
        .addSelect('COUNT(*)', 'count')
        .where('product.company_id = :companyId', {
          companyId: actor.companyId,
        })
        .groupBy('product.category_id')
        .getRawMany();
    const byId = new Map(
      counts.map((row) => [row.categoryId, Number(row.count)]),
    );
    const groups = await this.groupsRepository.find({
      where: { companyId: actor.companyId! },
      order: { name: 'ASC' },
    });
    const groupCounts: { groupId: string; count: string }[] =
      await this.productsRepository
        .createQueryBuilder('product')
        .select('product.group_id', 'groupId')
        .addSelect('COUNT(*)', 'count')
        .where('product.company_id = :companyId', {
          companyId: actor.companyId,
        })
        .andWhere('product.group_id IS NOT NULL')
        .groupBy('product.group_id')
        .getRawMany();
    const groupById = new Map(
      groupCounts.map((row) => [row.groupId, Number(row.count)]),
    );
    return categories.map((category) =>
      Object.assign(category, {
        productCount: byId.get(category.id) ?? 0,
        groups: groups
          .filter((group) => group.categoryId === category.id)
          .map((group) =>
            Object.assign(group, {
              productCount: groupById.get(group.id) ?? 0,
            }),
          ),
      }),
    );
  }

  async create(actor: AuthUser, dto: CreateCategoryDto): Promise<Category> {
    await this.assertNameFree(actor, dto.name);
    const saved = await this.categoriesRepository.save(
      this.categoriesRepository.create({ ...dto, companyId: actor.companyId! }),
    );
    await this.audit.record(
      actor,
      'category.create',
      `Created category ${saved.name}`,
    );
    return Object.assign(saved, { productCount: 0, groups: [] });
  }

  async update(
    actor: AuthUser,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findEntity(actor, id);
    if (dto.name && nameKey(dto.name) !== nameKey(category.name)) {
      await this.assertNameFree(actor, dto.name, id);
    }
    Object.assign(
      category,
      Object.fromEntries(
        Object.entries(dto).filter(([, value]) => value !== undefined),
      ),
    );
    const saved = await this.categoriesRepository.save(category);
    await this.audit.record(
      actor,
      'category.update',
      `Updated category ${saved.name}`,
    );
    return Object.assign(saved, {
      productCount: await this.productCount(actor, id),
    });
  }

  async remove(
    actor: AuthUser,
    id: string,
    dto: DeleteCategoryDto = {},
  ): Promise<void> {
    const category = await this.findEntity(actor, id);
    const count = await this.productCount(actor, id);
    if (count > 0 && dto.moveToCategoryId) {
      await this.moveProductsAndDelete(
        actor,
        category,
        count,
        dto.moveToCategoryId,
        dto.moveToGroupId,
      );
      return;
    }
    if (count > 0) {
      throw new ConflictException(
        `${category.name} has ${count} ${count === 1 ? 'product' : 'products'}, so it can't be deleted. Move them to another category or set it to Inactive.`,
      );
    }
    await this.categoriesRepository.remove(category);
    await this.audit.record(
      actor,
      'category.delete',
      `Deleted category ${category.name}`,
    );
  }

  private async moveProductsAndDelete(
    actor: AuthUser,
    category: Category,
    count: number,
    targetId: string,
    groupId?: string,
  ): Promise<void> {
    if (targetId === category.id) {
      throw new BadRequestException(
        'Choose another category to move the products to',
      );
    }
    const target = await this.categoriesRepository.findOneBy({
      id: targetId,
      companyId: actor.companyId!,
    });
    if (!target) {
      throw new BadRequestException('Choose a category from the list');
    }
    if (target.status !== CategoryStatus.ACTIVE) {
      throw new BadRequestException(`The category ${target.name} is inactive`);
    }
    const group = groupId
      ? await this.groupsService.usableGroup(actor, target.id, groupId)
      : null;
    await this.categoriesRepository.manager.transaction(async (manager) => {
      await manager.update(
        Product,
        { companyId: actor.companyId!, categoryId: category.id },
        { categoryId: target.id, groupId: group?.id ?? null },
      );
      await manager.remove(category);
    });
    await this.audit.record(
      actor,
      'category.delete',
      `Deleted category ${category.name}, ${count} products moved to ${target.name}${group ? ` / ${group.name}` : ''}`,
    );
  }

  private productCount(actor: AuthUser, categoryId: string): Promise<number> {
    return this.productsRepository.countBy({
      companyId: actor.companyId!,
      categoryId,
    });
  }

  private async findEntity(actor: AuthUser, id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOneBy({
      id,
      companyId: actor.companyId!,
    });
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  private async assertNameFree(
    actor: AuthUser,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const query = this.categoriesRepository
      .createQueryBuilder('category')
      .where('category.company_id = :companyId', { companyId: actor.companyId })
      .andWhere(`${nameKeySql('category.name')} = :key`, {
        key: nameKey(name),
      });
    if (exceptId) {
      query.andWhere('category.id <> :exceptId', { exceptId });
    }
    const existing = await query.getOne();
    if (existing) {
      throw new ConflictException(
        `A category named "${existing.name}" already exists`,
      );
    }
  }
}
