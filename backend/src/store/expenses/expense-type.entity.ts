import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn, type Relation } from 'typeorm';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { ExpenseCategory } from './expense-category.entity.js';
import { ExpenseItemStatus } from './expense-item-status.enum.js';

@Entity({ name: 'expense_types' })
@Unique(['companyId', 'id'])
export class ExpenseType extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => ExpenseCategory, (category) => category.types, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'category_id', referencedColumnName: 'id' },
  ])
  category?: Relation<ExpenseCategory>;

  @Column({ type: 'varchar', length: 140 })
  name!: string;

  @Column({ type: 'enum', enum: ExpenseItemStatus, enumName: 'expense_item_status', default: ExpenseItemStatus.ACTIVE })
  status!: ExpenseItemStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
