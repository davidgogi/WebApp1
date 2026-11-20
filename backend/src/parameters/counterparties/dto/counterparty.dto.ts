import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CounterpartyStatus } from '../counterparty-status.enum.js';
import { LegalForm } from '../legal-form.enum.js';
import { OrganizationType } from '../organization-type.enum.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const sent = (_: object, value: unknown) => value !== undefined;
const given = (_: object, value: unknown) =>
  value !== undefined && value !== null;
const DEFERRED_PAYMENT_DAYS = 'The deferred payment term is 1–365 days';
const SUPPLIER_PAYMENT_DAYS = "The supplier's payment term is 1–365 days";
const DELIVERY_DAYS = 'The delivery term is 1–365 working days';
const DISCOUNT = 'The discount is 0–100% with at most 2 decimals';
const CREDIT_LIMIT = 'The credit limit is 0 or more with at most 2 decimals';

export class CounterpartyContactDto {
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

export class CounterpartyDetailsDto {
  @ValidateIf(given)
  @IsInt({ message: DEFERRED_PAYMENT_DAYS })
  @Min(1, { message: DEFERRED_PAYMENT_DAYS })
  @Max(365, { message: DEFERRED_PAYMENT_DAYS })
  deferredPaymentDays?: number | null;

  @ValidateIf(given)
  @IsEnum(LegalForm)
  legalForm?: LegalForm | null;

  @ValidateIf(given)
  @Transform(trim)
  @IsString()
  @MaxLength(240)
  actualAddress?: string | null;

  @ValidateIf(given)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: DISCOUNT })
  @Min(0, { message: DISCOUNT })
  @Max(100, { message: DISCOUNT })
  discountPercent?: number | null;

  @ValidateIf(given)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: CREDIT_LIMIT })
  @Min(0, { message: CREDIT_LIMIT })
  @Max(9999999999.99, { message: CREDIT_LIMIT })
  creditLimit?: number | null;

  @ValidateIf(given)
  @IsInt({ message: SUPPLIER_PAYMENT_DAYS })
  @Min(1, { message: SUPPLIER_PAYMENT_DAYS })
  @Max(365, { message: SUPPLIER_PAYMENT_DAYS })
  supplierPaymentDays?: number | null;

  @ValidateIf(given)
  @IsInt({ message: DELIVERY_DAYS })
  @Min(1, { message: DELIVERY_DAYS })
  @Max(365, { message: DELIVERY_DAYS })
  deliveryDays?: number | null;

  @ValidateIf(given)
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  bankAccount?: string | null;
}

export class CreateCounterpartyDto extends CounterpartyDetailsDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name!: string;

  @IsEnum(OrganizationType)
  organizationType!: OrganizationType;

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

  @IsEnum(CounterpartyStatus)
  status!: CounterpartyStatus;

  @ValidateIf(sent)
  @IsIn(['form', 'rs'])
  source?: 'form' | 'rs';

  @ValidateIf(sent)
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CounterpartyContactDto)
  contacts?: CounterpartyContactDto[];
}

export class UpdateCounterpartyDto extends CounterpartyDetailsDto {
  @ValidateIf(sent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name?: string;

  @ValidateIf(sent)
  @IsEnum(OrganizationType)
  organizationType?: OrganizationType;

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
  @IsEnum(CounterpartyStatus)
  status?: CounterpartyStatus;

  @ValidateIf(sent)
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CounterpartyContactDto)
  contacts?: CounterpartyContactDto[];
}
