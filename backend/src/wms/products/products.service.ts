import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
  ) {}

  findAll(): Promise<Product[]> {
    return this.productsRepository.find({
      relations: { warehouses: true },
      order: { name: 'ASC', warehouses: { code: 'ASC' } },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { warehouses: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const { warehouseIds, ...fields } = dto;
    const product = this.productsRepository.create({
      ...fields,
      sku: this.normalizeSku(fields.sku),
      warehouses: await this.findWarehouses(warehouseIds),
    });
    this.assertWholePieces(product);
    return this.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const { warehouseIds, ...fields } = dto;
    const product = await this.findOne(id);

    Object.assign(product, fields);
    if (fields.sku) {
      product.sku = this.normalizeSku(fields.sku);
    }
    if (warehouseIds) {
      product.warehouses = await this.findWarehouses(warehouseIds);
    }

    this.assertWholePieces(product);
    return this.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
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

  private async findWarehouses(ids: string[]): Promise<Warehouse[]> {
    const uniqueIds = [...new Set(ids)];
    const warehouses = uniqueIds.length ? await this.warehousesRepository.findBy({ id: In(uniqueIds) }) : [];

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
