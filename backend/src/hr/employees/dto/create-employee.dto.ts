import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EmployeeRole } from '../employee-role.enum.js';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEnum(EmployeeRole)
  role!: EmployeeRole;
}
