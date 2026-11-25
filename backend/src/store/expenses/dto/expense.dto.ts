import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ExpenseItemStatus } from '../expense-item-status.enum.js';
import { ExpenseSource } from '../expense-source.enum.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const blankToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const given = (_: object, value: unknown) => value !== undefined && value !== null;
const sent = (_: object, value: unknown) => value !== undefined;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ExpenseLineDto {
  @IsUUID()
  typeId!: string;

  @IsEnum(ExpenseSource)
  source!: ExpenseSource;

  @ValidateIf((line: ExpenseLineDto) => line.source === ExpenseSource.BANK)
  @IsUUID()
  bankAccountId?: string;

  @ValidateIf((line: ExpenseLineDto) => line.source === ExpenseSource.BANK)
  @IsUUID()
  storeId?: string;

  @ValidateIf((line: ExpenseLineDto) => line.source === ExpenseSource.SHORTAGE)
  @IsUUID()
  sessionId?: string;

  @ValidateIf(given)
  @IsUUID()
  supplierId?: string | null;

  @ValidateIf(given)
  @Matches(DATE, { message: 'expenseDate must be YYYY-MM-DD' })
  expenseDate?: string | null;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'The amount must be a number with at most 2 decimals' })
  @Min(0.01, { message: 'The amount must be more than ₾0' })
  @Max(10_000_000)
  amount!: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Write the purpose of the expense' })
  @MaxLength(500)
  purpose!: string;
}

export class CreateExpensesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ExpenseLineDto)
  lines!: ExpenseLineDto[];
}

export class VoidExpenseDto {
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

export class ExpenseCategoryDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name!: string;

  @IsOptional()
  @IsEnum(ExpenseItemStatus)
  status?: ExpenseItemStatus;
}

export class UpdateExpenseCategoryDto {
  @ValidateIf(sent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name?: string;

  @ValidateIf(sent)
  @IsEnum(ExpenseItemStatus)
  status?: ExpenseItemStatus;
}

export class ExpenseTypeDto extends ExpenseCategoryDto {}

export class UpdateExpenseTypeDto extends UpdateExpenseCategoryDto {
  @ValidateIf(sent)
  @IsUUID()
  categoryId?: string;
}

export class BankAccountDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name!: string;

  @ValidateIf(given)
  @Transform(blankToNull)
  @IsString()
  @MaxLength(60)
  accountNumber?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'The opening balance must be a number with at most 2 decimals' })
  @Min(0)
  @Max(1_000_000_000)
  openingBalance?: number;

  @IsOptional()
  @IsEnum(ExpenseItemStatus)
  status?: ExpenseItemStatus;
}

export class UpdateBankAccountDto {
  @ValidateIf(sent)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  name?: string;

  @ValidateIf(given)
  @Transform(blankToNull)
  @IsString()
  @MaxLength(60)
  accountNumber?: string | null;

  @ValidateIf(sent)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'The opening balance must be a number with at most 2 decimals' })
  @Min(0)
  @Max(1_000_000_000)
  openingBalance?: number;

  @ValidateIf(sent)
  @IsEnum(ExpenseItemStatus)
  status?: ExpenseItemStatus;
}
