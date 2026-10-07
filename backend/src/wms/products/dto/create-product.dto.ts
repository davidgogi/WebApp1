import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { ProductUnit } from '../product-unit.enum.js';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  sku!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  supplier!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  amount!: number;

  @IsEnum(ProductUnit)
  unit!: ProductUnit;

  @IsArray()
  @IsUUID('all', { each: true })
  warehouseIds!: string[];
}
