import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { decimalTransformer } from '../../common/decimal.transformer.js';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { ExpenseItemStatus } from './expense-item-status.enum.js';

@Entity({ name: 'bank_accounts' })
@Unique(['companyId', 'id'])
export class BankAccount extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 140 })
  name!: string;

  @Column({ name: 'account_number', type: 'varchar', length: 40, nullable: true })
  accountNumber!: string | null;

  @Column({ name: 'opening_balance', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  openingBalance!: number;

  @Column({ type: 'enum', enum: ExpenseItemStatus, enumName: 'expense_item_status', default: ExpenseItemStatus.ACTIVE })
  status!: ExpenseItemStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
