import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { WarehouseStatus } from '../warehouse-status.enum.js';
import { WarehouseType } from '../warehouse-type.enum.js';

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(WarehouseType)
  type?: WarehouseType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  branches?: string[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;

  // An employee with the manager role in WMS. null / missing = no manager.
  @IsOptional()
  @IsUUID()
  managerId?: string | null;
}
