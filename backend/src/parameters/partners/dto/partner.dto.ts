import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PartnerStatus } from '../partner-status.enum.js';
import { PartnerType } from '../partner-type.enum.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const sent = (_: object, value: unknown) => value !== undefined;

export class PartnerContactDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @Transform(trim)
  @IsNotEmpty()
  @Matches(/^\+?[0-9 ()-]{7,20}$/, { message: 'phone must be a phone number' })
  phone!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  position!: string;

  @Transform(trim)
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

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

  @Transform(trim)
  @IsNotEmpty()
  @Matches(/^(\d{9}|\d{11})$/, {
    message:
      'The identification code has 9 digits (company) or 11 digits (personal ID)',
  })
  identificationCode!: string;

  @IsBoolean()
  vatPayer!: boolean;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contactPerson!: string;

  @Transform(trim)
  @IsNotEmpty()
  @Matches(/^\+?[0-9 ()-]{7,20}$/, { message: 'phone must be a phone number' })
  phone!: string;

  @Transform(trim)
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  address!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category!: string;

  @ValidateIf(sent)
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsEnum(PartnerStatus)
  status!: PartnerStatus;

  @ValidateIf(sent)
  @IsIn(['form', 'rs'])
  source?: 'form' | 'rs';

  @ValidateIf(sent)
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PartnerContactDto)
  contacts?: PartnerContactDto[];
}

export class UpdatePartnerDto {
  @ValidateIf(sent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name?: string;

  @ValidateIf(sent)
  @IsEnum(PartnerType)
  type?: PartnerType;

  @ValidateIf(sent)
  @IsBoolean()
  isSupplier?: boolean;

  @ValidateIf(sent)
  @IsBoolean()
  isClient?: boolean;

  @ValidateIf(sent)
  @Transform(trim)
  @IsNotEmpty()
  @Matches(/^(\d{9}|\d{11})$/, {
    message:
      'The identification code has 9 digits (company) or 11 digits (personal ID)',
  })
  identificationCode?: string;

  @ValidateIf(sent)
  @IsBoolean()
  vatPayer?: boolean;

  @ValidateIf(sent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contactPerson?: string;

  @ValidateIf(sent)
  @Transform(trim)
  @IsNotEmpty()
  @Matches(/^\+?[0-9 ()-]{7,20}$/, { message: 'phone must be a phone number' })
  phone?: string;

  @ValidateIf(sent)
  @Transform(trim)
  @IsNotEmpty()
  @IsEmail()
  email?: string;

  @ValidateIf(sent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  address?: string;

  @ValidateIf(sent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category?: string;

  @ValidateIf(sent)
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ValidateIf(sent)
  @IsEnum(PartnerStatus)
  status?: PartnerStatus;

  @ValidateIf(sent)
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PartnerContactDto)
  contacts?: PartnerContactDto[];
}
