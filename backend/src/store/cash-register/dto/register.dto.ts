import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { CashMoveKind } from '../cash-move-kind.enum.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const PIN = /^\d{4}$/;
const PIN_MESSAGE = 'The PIN must be exactly 4 digits';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class OpenRegisterDto {
  @IsUUID()
  storeId!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  registerNo!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  openingCash!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsString()
  @Matches(PIN, { message: PIN_MESSAGE })
  pin!: string;
}

export class CloseRegisterDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  countedCash!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsString()
  @Matches(PIN, { message: PIN_MESSAGE })
  pin!: string;
}

export class CashMoveDto {
  @IsEnum(CashMoveKind)
  kind!: CashMoveKind;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  amount!: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note!: string;
}

export class CommentDto {
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  comment!: string;
}

export class CoverageDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  amount!: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class PinDto {
  @IsOptional()
  @IsString()
  currentPin?: string;

  @IsString()
  @Matches(PIN, { message: PIN_MESSAGE })
  newPin!: string;
}

export class PeriodQuery {
  @IsOptional()
  @Matches(DATE, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DATE, { message: 'to must be YYYY-MM-DD' })
  to?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;
}
