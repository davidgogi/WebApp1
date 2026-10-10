import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service.js';
import { AuthUser } from '../../auth/auth-user.js';
import { isUniqueViolation } from '../../common/is-unique-violation.js';
import { Warehouse } from '../warehouses/warehouse.entity.js';
import { Product } from './product.entity.js';
import { ProductUnit } from './product-unit.enum.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
    private readonly audit: AuditService,
  ) {}

  findAll(actor: AuthUser): Promise<Product[]> {
    return this.productsRepository.find({
      where: { companyId: actor.companyId! },
      relations: { warehouses: true },
      order: { name: 'ASC', warehouses: { code: 'ASC' } },
    });
  }

  async findOne(actor: AuthUser, id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id, companyId: actor.companyId! },
      relations: { warehouses: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return product;
  }

  async create(actor: AuthUser, dto: CreateProductDto): Promise<Product> {
    const { warehouseIds, ...fields } = dto;
    const product = this.productsRepository.create({
      ...fields,
      companyId: actor.companyId!,
      sku: this.normalizeSku(fields.sku),
      warehouses: await this.findWarehouses(actor, warehouseIds),
    });
    this.assertWholePieces(product);
    const saved = await this.save(product);
    await this.audit.record(actor, 'product.create', `Created product ${saved.sku} ${saved.name}`);
    return saved;
  }

  async update(actor: AuthUser, id: string, dto: UpdateProductDto): Promise<Product> {
    const { warehouseIds, ...fields } = dto;
    const product = await this.findOne(actor, id);

    Object.assign(product, fields);
    if (fields.sku) {
      product.sku = this.normalizeSku(fields.sku);
    }
    if (warehouseIds) {
      product.warehouses = await this.findWarehouses(actor, warehouseIds);
    }

    this.assertWholePieces(product);
    const saved = await this.save(product);
    await this.audit.record(actor, 'product.update', `Updated product ${saved.sku} ${saved.name}`);
    return saved;
  }

  async remove(actor: AuthUser, id: string): Promise<void> {
    const product = await this.findOne(actor, id);
    await this.productsRepository.remove(product);
    await this.audit.record(actor, 'product.delete', `Deleted product ${product.sku} ${product.name}`);
  }

  private async save(product: Product): Promise<Product> {
    try {
      return await this.productsRepository.save(product);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`SKU ${product.sku} is already used by another product`);
      }
      throw error;
    }
  }

  private async findWarehouses(actor: AuthUser, ids: string[]): Promise<Warehouse[]> {
    const uniqueIds = [...new Set(ids)];
    const warehouses = uniqueIds.length
      ? await this.warehousesRepository.findBy({ id: In(uniqueIds), companyId: actor.companyId! })
      : [];

    if (warehouses.length !== uniqueIds.length) {
      throw new BadRequestException('One or more warehouses do not exist');
    }

    return warehouses;
  }

  private assertWholePieces(product: Product): void {
    if (product.unit === ProductUnit.PCS && !Number.isInteger(Number(product.amount))) {
      throw new BadRequestException('Amount must be a whole number when the unit is pcs');
    }
  }

  private normalizeSku(sku: string): string {
    return sku.trim().toUpperCase();
  }
}
