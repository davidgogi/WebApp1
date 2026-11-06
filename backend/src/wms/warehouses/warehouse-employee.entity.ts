import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { Employee } from '../../hr/employees/employee.entity.js';
import { Warehouse } from './warehouse.entity.js';

@Entity({ name: 'warehouse_employees' })
@Index(['employeeId'])
export class WarehouseEmployee extends TenantEntity {
  @PrimaryColumn({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @PrimaryColumn({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'warehouse_id', referencedColumnName: 'id' },
  ])
  warehouse?: Warehouse;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'employee_id', referencedColumnName: 'id' },
  ])
  employee?: Employee;
}
