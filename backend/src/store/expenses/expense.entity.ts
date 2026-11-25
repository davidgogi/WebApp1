import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, type Relation } from 'typeorm';
import { decimalTransformer } from '../../common/decimal.transformer.js';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { RegisterSession } from '../cash-register/register-session.entity.js';
import { Store } from '../stores/store.entity.js';
import { BankAccount } from './bank-account.entity.js';
import { ExpenseCategory } from './expense-category.entity.js';
import { ExpenseSource } from './expense-source.enum.js';
import { ExpenseStatus } from './expense-status.enum.js';
import { ExpenseType } from './expense-type.entity.js';

@Entity({ name: 'expenses' })
@Unique(['companyId', 'number'])
@Unique(['companyId', 'id'])
@Index(['companyId', 'sessionId'])
@Index(['companyId', 'expenseDate'])
@Check('"amount" > 0')
@Check(
  `("source" IN ('cash', 'shortage') AND "session_id" IS NOT NULL AND "bank_account_id" IS NULL) OR ("source" = 'bank' AND "bank_account_id" IS NOT NULL AND "session_id" IS NULL)`,
)
@Check(`"source" = 'shortage' OR ("category_id" IS NOT NULL AND "type_id" IS NOT NULL)`)
export class Expense extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  number!: number;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @ManyToOne(() => Store)
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'store_id', referencedColumnName: 'id' },
  ])
  store?: Relation<Store>;

  @Column({ type: 'enum', enum: ExpenseSource, enumName: 'expense_source' })
  source!: ExpenseSource;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId!: string | null;

  @ManyToOne(() => RegisterSession)
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'session_id', referencedColumnName: 'id' },
  ])
  session?: Relation<RegisterSession> | null;

  @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
  bankAccountId!: string | null;

  @ManyToOne(() => BankAccount)
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'bank_account_id', referencedColumnName: 'id' },
  ])
  bankAccount?: Relation<BankAccount> | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => ExpenseCategory)
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'category_id', referencedColumnName: 'id' },
  ])
  category?: Relation<ExpenseCategory> | null;

  @Column({ name: 'type_id', type: 'uuid', nullable: true })
  typeId!: string | null;

  @ManyToOne(() => ExpenseType)
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'type_id', referencedColumnName: 'id' },
  ])
  type?: Relation<ExpenseType> | null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId!: string | null;

  @Column({ name: 'supplier_name', type: 'varchar', length: 140, nullable: true })
  supplierName!: string | null;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @Column({ type: 'varchar', length: 500 })
  purpose!: string;

  @Column({ type: 'enum', enum: ExpenseStatus, enumName: 'expense_status', default: ExpenseStatus.ACTIVE })
  status!: ExpenseStatus;

  @Column({ name: 'created_by_name' })
  createdByName!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt!: Date | null;

  @Column({ name: 'voided_by_name', type: 'varchar', nullable: true })
  voidedByName!: string | null;

  @Column({ name: 'void_reason', type: 'varchar', length: 500, nullable: true })
  voidReason!: string | null;
}
