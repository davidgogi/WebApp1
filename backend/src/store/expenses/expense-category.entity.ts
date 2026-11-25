import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn, type Relation } from 'typeorm';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { ExpenseItemStatus } from './expense-item-status.enum.js';
import { ExpenseType } from './expense-type.entity.js';

@Entity({ name: 'expense_categories' })
@Unique(['companyId', 'id'])
export class ExpenseCategory extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 140 })
  name!: string;

  @Column({ type: 'enum', enum: ExpenseItemStatus, enumName: 'expense_item_status', default: ExpenseItemStatus.ACTIVE })
  status!: ExpenseItemStatus;

  @OneToMany(() => ExpenseType, (type) => type.category)
  types?: Relation<ExpenseType>[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
