import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/is-unique-violation.js';
import { Employee } from './employee.entity.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
  ) {}

  findAll(): Promise<Employee[]> {
    return this.employeesRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeesRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    return employee;
  }

  create(dto: CreateEmployeeDto): Promise<Employee> {
    const employee = this.employeesRepository.create(dto);
    this.assertValidDates(employee);
    return this.save(employee);
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);
    Object.assign(employee, dto);
    this.assertValidDates(employee);
    return this.save(employee);
  }

  async remove(id: string): Promise<void> {
    const employee = await this.findOne(id);
    await this.employeesRepository.remove(employee);
  }

  private async save(employee: Employee): Promise<Employee> {
    try {
      return await this.employeesRepository.save(employee);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `An employee with personal ID ${employee.personalId} already exists`,
        );
      }
      throw error;
    }
  }

  // Dates are 'YYYY-MM-DD' strings, so comparing them as strings compares them as dates.
  private assertValidDates(employee: Employee): void {
    const today = new Date().toISOString().slice(0, 10);

    if (employee.birthDate && employee.birthDate >= today) {
      throw new BadRequestException('Date of birth must be in the past');
    }
    if (
      employee.birthDate &&
      employee.hireDate &&
      employee.hireDate < employee.birthDate
    ) {
      throw new BadRequestException(
        'Hire date cannot be before the date of birth',
      );
    }
    if (
      employee.hireDate &&
      employee.endDate &&
      employee.endDate < employee.hireDate
    ) {
      throw new BadRequestException('End date cannot be before the hire date');
    }
  }
}
