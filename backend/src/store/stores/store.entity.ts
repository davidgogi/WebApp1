import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { Employee } from '../../hr/employees/employee.entity.js';

@Entity({ name: 'stores' })
export class Store extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  address!: string;

  // How many cash registers the store has: Register 1 .. Register N. Set by the admins.
  @Column({ type: 'int', default: 1 })
  registers!: number;

  // One manager per store; a manager can run several stores.
  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId!: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id' })
  manager!: Employee | null;

  // Everyone who works in this store: cashiers (who may open a register here) and people without
  // a role. The store's manager is not a member; he is `manager`. Set only when a Store manager adds
  // someone in HR; never returned by the stores API.
  @ManyToMany(() => Employee, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'store_employees',
    joinColumn: { name: 'store_id' },
    inverseJoinColumn: { name: 'employee_id' },
  })
  members!: Employee[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
