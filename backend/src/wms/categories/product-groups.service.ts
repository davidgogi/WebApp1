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
import { isUniqueViolation } from '../../common/is-unique-violation.js';
import { nameKey, nameKeySql } from '../../common/name-key.js';
import { Product } from '../products/product.entity.js';
import { CategoryStatus } from './category-status.enum.js';
import { Category } from './category.entity.js';
import {
  CreateProductGroupDto,
  DeleteProductGroupDto,
  UpdateProductGroupDto,
} from './dto/product-group.dto.js';
import { ProductGroup } from './product-group.entity.js';

@Injectable()
export class ProductGroupsService {
  constructor(
    @InjectRepository(ProductGroup)
    private readonly groupsRepository: Repository<ProductGroup>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly audit: AuditService,
  ) {}

  async create(
    actor: AuthUser,
    categoryId: string,
    dto: CreateProductGroupDto,
  ): Promise<ProductGroup> {
    const category = await this.findCategory(actor, categoryId);
    await this.assertNameFree(actor, category, dto.name);
    const saved = await this.save(
      this.groupsRepository.create({
        ...dto,
        categoryId,
        companyId: actor.companyId!,
      }),
      category,
    );
    await this.audit.record(
      actor,
      'group.create',
      `Created group ${saved.name} in ${category.name}`,
    );
    return Object.assign(saved, { productCount: 0 });
  }

  async update(
    actor: AuthUser,
    categoryId: string,
    id: string,
    dto: UpdateProductGroupDto,
  ): Promise<ProductGroup> {
    const category = await this.findCategory(actor, categoryId);
    const group = await this.findGroup(actor, categoryId, id);
    if (dto.name && nameKey(dto.name) !== nameKey(group.name)) {
      await this.assertNameFree(actor, category, dto.name, id);
    }
    Object.assign(
      group,
      Object.fromEntries(
        Object.entries(dto).filter(([, value]) => value !== undefined),
      ),
    );
    const saved = await this.save(group, category);
    await this.audit.record(
      actor,
      'group.update',
      `Updated group ${saved.name} in ${category.name}`,
    );
    return Object.assign(saved, {
      productCount: await this.productCount(actor, id),
    });
  }

  async remove(
    actor: AuthUser,
    categoryId: string,
    id: string,
    dto: DeleteProductGroupDto,
  ): Promise<void> {
    const category = await this.findCategory(actor, categoryId);
    const group = await this.findGroup(actor, categoryId, id);
    const count = await this.productCount(actor, id);
    let moveTo: ProductGroup | null = null;
    if (count > 0) {
      if (!dto.moveToGroupId && !dto.noGroup) {
        throw new ConflictException(
          `${group.name} has ${count} ${count === 1 ? 'product' : 'products'}, so it can't be deleted. Choose where to move them first.`,
        );
      }
      if (dto.moveToGroupId) {
        if (dto.moveToGroupId === id) {
          throw new BadRequestException(
            'Choose another group to move the products to',
          );
        }
        moveTo = await this.usableGroup(actor, categoryId, dto.moveToGroupId);
      }
    }
    await this.groupsRepository.manager.transaction(async (manager) => {
      if (count > 0) {
        await manager.update(
          Product,
          { companyId: actor.companyId!, groupId: id },
          { groupId: moveTo?.id ?? null },
        );
      }
      await manager.remove(group);
    });
    await this.audit.record(
      actor,
      'group.delete',
      count > 0
        ? `Deleted group ${group.name} in ${category.name}, ${count} products moved to ${moveTo?.name ?? 'no group'}`
        : `Deleted group ${group.name} in ${category.name}`,
    );
  }

  async usableGroup(
    actor: AuthUser,
    categoryId: string,
    id: string,
  ): Promise<ProductGroup> {
    const group = await this.groupsRepository.findOneBy({
      id,
      categoryId,
      companyId: actor.companyId!,
    });
    if (!group) {
      throw new BadRequestException('Choose a group from the list');
    }
    if (group.status !== CategoryStatus.ACTIVE) {
      throw new BadRequestException(`The group ${group.name} is inactive`);
    }
    return group;
  }

  private productCount(actor: AuthUser, groupId: string): Promise<number> {
    return this.productsRepository.countBy({
      companyId: actor.companyId!,
      groupId,
    });
  }

  private async save(
    group: ProductGroup,
    category: Category,
  ): Promise<ProductGroup> {
    try {
      return await this.groupsRepository.save(group);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `A group named "${group.name}" already exists in ${category.name}`,
        );
      }
      throw error;
    }
  }

  private async findCategory(actor: AuthUser, id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOneBy({
      id,
      companyId: actor.companyId!,
    });
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  private async findGroup(
    actor: AuthUser,
    categoryId: string,
    id: string,
  ): Promise<ProductGroup> {
    const group = await this.groupsRepository.findOneBy({
      id,
      categoryId,
      companyId: actor.companyId!,
    });
    if (!group) {
      throw new NotFoundException(`Group ${id} not found`);
    }
    return group;
  }

  private async assertNameFree(
    actor: AuthUser,
    category: Category,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const query = this.groupsRepository
      .createQueryBuilder('grp')
      .where('grp.company_id = :companyId', { companyId: actor.companyId })
      .andWhere('grp.category_id = :categoryId', { categoryId: category.id })
      .andWhere(`${nameKeySql('grp.name')} = :key`, { key: nameKey(name) });
    if (exceptId) {
      query.andWhere('grp.id <> :exceptId', { exceptId });
    }
    const existing = await query.getOne();
    if (existing) {
      throw new ConflictException(
        `A group named "${existing.name}" already exists in ${category.name}`,
      );
    }
  }
}
