import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { WarehouseStatus } from '../warehouse-status.enum.js';
import { WarehouseType } from '../warehouse-type.enum.js';

export class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(WarehouseType)
  type!: WarehouseType;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  branches!: string[];

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;

  // An employee with the manager role in WMS. null / missing = no manager.
  @IsOptional()
  @IsUUID()
  managerId?: string | null;
}
