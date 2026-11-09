import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CategoryStatus } from '../category-status.enum.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProductGroupDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}

export class UpdateProductGroupDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}

export class DeleteProductGroupDto {
  @IsOptional()
  @IsUUID()
  moveToGroupId?: string;

  @IsOptional()
  @IsIn(['true'])
  noGroup?: string;
}

export class DeleteCategoryDto {
  @IsOptional()
  @IsUUID()
  moveToCategoryId?: string;

  @IsOptional()
  @IsUUID()
  moveToGroupId?: string;
}
