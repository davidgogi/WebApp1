import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { Employee } from '../../hr/employees/employee.entity.js';
import { Store } from './store.entity.js';

@Entity({ name: 'store_employees' })
@Index(['employeeId'])
export class StoreEmployee extends TenantEntity {
  @PrimaryColumn({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @PrimaryColumn({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'store_id', referencedColumnName: 'id' },
  ])
  store?: Store;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'employee_id', referencedColumnName: 'id' },
  ])
  employee?: Employee;
}
