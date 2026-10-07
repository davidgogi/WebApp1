import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { WarehousesService } from './warehouses.service.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import { Warehouse } from './warehouse.entity.js';

@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  findAll(): Promise<Warehouse[]> {
    return this.warehousesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Warehouse> {
    return this.warehousesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateWarehouseDto): Promise<Warehouse> {
    return this.warehousesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto): Promise<Warehouse> {
    return this.warehousesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.warehousesService.remove(id);
  }
}
