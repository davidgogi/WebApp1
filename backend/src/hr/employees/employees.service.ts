import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    return this.employeesRepository.save(employee);
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);
    Object.assign(employee, dto);
    return this.employeesRepository.save(employee);
  }

  async remove(id: string): Promise<void> {
    const employee = await this.findOne(id);
    await this.employeesRepository.remove(employee);
  }
}
