import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { decimalTransformer } from '../../common/decimal.transformer.js';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { Store } from '../stores/store.entity.js';
import { CoverageStatus } from './coverage-status.enum.js';
import { RegisterCashMove } from './register-cash-move.entity.js';
import { Sale } from './sale.entity.js';
import { ShortageCoverage } from './shortage-coverage.entity.js';

const money = { type: 'numeric' as const, precision: 12, scale: 2, transformer: decimalTransformer };

@Index('UQ_open_register_session', ['storeId', 'registerNo'], { unique: true, where: '"closed_at" IS NULL' })
@Index('UQ_open_session_per_cashier', ['companyId', 'cashierId'], { unique: true, where: '"closed_at" IS NULL' })
@Entity({ name: 'register_sessions' })
@Unique(['companyId', 'id'])
export class RegisterSession extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Relation<Store>;

  @Column({ name: 'cashier_id', type: 'uuid', nullable: true })
  cashierId!: string | null;

  @Column({ name: 'cashier_name' })
  cashierName!: string;

  @Column({ name: 'register_no', type: 'int' })
  registerNo!: number;

  @Column({ name: 'opening_cash', ...money })
  openingCash!: number;

  @Column({ name: 'open_note', type: 'varchar', length: 500, nullable: true })
  openNote!: string | null;

  @Column({ name: 'counted_cash', ...money, nullable: true })
  countedCash!: number | null;

  @Column({ name: 'expected_cash', ...money, nullable: true })
  expectedCash!: number | null;

  @Column({ ...money, nullable: true })
  variance!: number | null;

  @Column({ name: 'close_note', type: 'varchar', length: 500, nullable: true })
  closeNote!: string | null;

  @Column({ name: 'closed_by_name', type: 'varchar', nullable: true })
  closedByName!: string | null;

  @Column({
    name: 'coverage_status',
    type: 'enum',
    enum: CoverageStatus,
    enumName: 'shortage_coverage_status',
    nullable: true,
  })
  coverageStatus!: CoverageStatus | null;

  @CreateDateColumn({ name: 'opened_at', type: 'timestamptz' })
  openedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @OneToMany(() => Sale, (sale) => sale.session)
  sales!: Relation<Sale>[];

  @OneToMany(() => RegisterCashMove, (move) => move.session)
  cashMoves!: Relation<RegisterCashMove>[];

  @OneToMany(() => ShortageCoverage, (coverage) => coverage.session)
  coverages!: Relation<ShortageCoverage>[];
}
