import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Warehouse } from './warehouse.entity.js';
import { WarehouseType } from './warehouse-type.enum.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';

const CODE_PREFIXES: Record<WarehouseType, string> = {
  [WarehouseType.MAIN]: 'WH-MAIN',
  [WarehouseType.SALES]: 'WH-SALE',
};

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
  ) {}

  findAll(): Promise<Warehouse[]> {
    return this.warehousesRepository.find({ order: { code: 'ASC' } });
  }

  async findOne(id: string): Promise<Warehouse> {
    const warehouse = await this.warehousesRepository.findOne({ where: { id } });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }

    return warehouse;
  }

  async create(dto: CreateWarehouseDto): Promise<Warehouse> {
    const warehouse = this.warehousesRepository.create(dto);
    warehouse.code = await this.nextCode(dto.type);
    return this.warehousesRepository.save(warehouse);
  }

  async update(id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    const warehouse = await this.findOne(id);

    // The code encodes the type, so a type change gets a new code.
    if (dto.type && dto.type !== warehouse.type) {
      warehouse.code = await this.nextCode(dto.type);
    }

    Object.assign(warehouse, dto);
    return this.warehousesRepository.save(warehouse);
  }

  async remove(id: string): Promise<void> {
    const warehouse = await this.findOne(id);
    await this.warehousesRepository.remove(warehouse);
  }

  // Highest existing number for the type's prefix + 1, e.g. WH-SALE-02 -> WH-SALE-03.
  private async nextCode(type: WarehouseType): Promise<string> {
    const prefix = CODE_PREFIXES[type];
    const existing = await this.warehousesRepository.find({
      select: { code: true },
      where: { code: Like(`${prefix}-%`) },
    });
    const highest = Math.max(0, ...existing.map((w) => Number(w.code.slice(prefix.length + 1)) || 0));
    return `${prefix}-${String(highest + 1).padStart(2, '0')}`;
  }
}
