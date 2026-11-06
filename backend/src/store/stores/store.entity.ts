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
import { Employee } from '../../hr/employees/employee.entity.js';

@Entity({ name: 'stores' })
@Unique(['companyId', 'id'])
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
