import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PartnerStatus } from '../partner-status.enum.js';
import { PartnerType } from '../partner-type.enum.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const trimOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class CreatePartnerDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name!: string;

  @IsEnum(PartnerType)
  type!: PartnerType;

  @IsBoolean()
  isSupplier!: boolean;

  @IsBoolean()
  isClient!: boolean;

  @IsOptional()
  @Transform(trimOrNull)
  @Matches(/^(\d{9}|\d{11})$/, {
    message:
      'The identification code has 9 digits (company) or 11 digits (personal ID)',
  })
  identificationCode?: string | null;

  @IsOptional()
  @IsBoolean()
  vatPayer?: boolean;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(120)
  contactPerson?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @Matches(/^\+?[0-9 ()-]{7,20}$/, { message: 'phone must be a phone number' })
  phone?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(240)
  address?: string | null;

  @IsOptional()
  @IsEnum(PartnerStatus)
  status?: PartnerStatus;
}

export class UpdatePartnerDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name?: string;

  @IsOptional()
  @IsEnum(PartnerType)
  type?: PartnerType;

  @IsOptional()
  @IsBoolean()
  isSupplier?: boolean;

  @IsOptional()
  @IsBoolean()
  isClient?: boolean;

  @IsOptional()
  @Transform(trimOrNull)
  @Matches(/^(\d{9}|\d{11})$/, {
    message:
      'The identification code has 9 digits (company) or 11 digits (personal ID)',
  })
  identificationCode?: string | null;

  @IsOptional()
  @IsBoolean()
  vatPayer?: boolean;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(120)
  contactPerson?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @Matches(/^\+?[0-9 ()-]{7,20}$/, { message: 'phone must be a phone number' })
  phone?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(240)
  address?: string | null;

  @IsOptional()
  @IsEnum(PartnerStatus)
  status?: PartnerStatus;
}
