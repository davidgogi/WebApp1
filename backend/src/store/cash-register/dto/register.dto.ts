import { IsInt, IsNumber, IsUUID, Max, Min } from 'class-validator';

export class OpenRegisterDto {
  @IsUUID()
  storeId!: string;

  // Which register of the store (1..registers).
  @IsInt()
  @Min(1)
  @Max(50)
  registerNo!: number;

  // Cash in the drawer at the start.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  openingCash!: number;
}

export class CloseRegisterDto {
  // Cash counted in the drawer at the end.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  closingCash!: number;
}
