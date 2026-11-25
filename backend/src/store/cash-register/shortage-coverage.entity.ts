import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, type Relation } from 'typeorm';
import { decimalTransformer } from '../../common/decimal.transformer.js';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { Expense } from '../expenses/expense.entity.js';
import { RegisterSession } from './register-session.entity.js';

@Entity({ name: 'shortage_coverages' })
@Unique(['companyId', 'number'])
@Index(['companyId', 'sessionId'])
export class ShortageCoverage extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  number!: number;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => RegisterSession, (session) => session.coverages, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'session_id', referencedColumnName: 'id' },
  ])
  session?: Relation<RegisterSession>;

  @Column({ name: 'expense_id', type: 'uuid', nullable: true })
  expenseId!: string | null;

  @ManyToOne(() => Expense)
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'expense_id', referencedColumnName: 'id' },
  ])
  expense?: Relation<Expense> | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note!: string | null;

  @Column({ name: 'covered_by_name' })
  coveredByName!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
