import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { Warehouse } from '../../wms/warehouses/warehouse.entity.js';
import { Employee } from '../../hr/employees/employee.entity.js';

@Entity({ name: 'stores' })
@Unique(['companyId', 'id'])
@Unique(['companyId', 'warehouseId'])
export class Store extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  address!: string;

  @Column({ type: 'int', default: 1 })
  registers!: number;

  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId!: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id' })
  manager!: Employee | null;

  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouseId!: string | null;

  @ManyToOne(() => Warehouse, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'warehouse_id', referencedColumnName: 'id' },
  ])
  warehouse!: Warehouse | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
