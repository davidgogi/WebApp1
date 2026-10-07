import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EmployeeRole } from '../employee-role.enum.js';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @IsEnum(EmployeeRole)
  role?: EmployeeRole;
}
