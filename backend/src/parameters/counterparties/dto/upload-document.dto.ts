import { IsDateString, IsEnum, ValidateIf } from 'class-validator';
import { CounterpartyDocumentType } from '../counterparty-document-type.enum.js';

export class UploadDocumentDto {
  @IsEnum(CounterpartyDocumentType)
  type!: CounterpartyDocumentType;

  @ValidateIf((_: object, value: unknown) => value !== undefined && value !== '')
  @IsDateString({ strict: true }, { message: 'The valid-until date must be a date' })
  validUntil?: string;
}
