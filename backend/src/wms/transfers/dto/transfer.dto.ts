import { Transform, Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, ValidateNested } from 'class-validator';

const blankToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class TransferLineDto {
  @IsOptional()
  @IsUUID()
  productId!: string | null;

  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'quantity must be a number with at most 3 decimals' })
  @Min(0.001, { message: 'quantity must be more than 0' })
  quantity!: number;
}

export class SaveTransferDto {
  @IsUUID()
  fromWarehouseId!: string;

  @IsUUID()
  toWarehouseId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  note?: string | null;

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(120)
  driverName?: string | null;

  @IsOptional()
  @Transform(blankToNull)
  @Matches(/^\d{11}$/, { message: "driverId must be the driver's 11-digit personal ID" })
  driverId?: string | null;

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(20)
  carNumber?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  lines!: TransferLineDto[];
}

export class ReceivedLineDto {
  @IsUUID()
  lineId!: string;

  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'receivedQuantity must be a number with at most 3 decimals' })
  @Min(0)
  receivedQuantity!: number;
}

export class ReceiveTransferDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivedLineDto)
  lines!: ReceivedLineDto[];
}

export class CreateTransferFromRsDto {
  @IsUUID()
  fromWarehouseId!: string;

  @IsUUID()
  toWarehouseId!: string;
}
