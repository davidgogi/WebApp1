import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { decimalTransformer } from '../../common/decimal.transformer.js';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { CashMoveKind } from './cash-move-kind.enum.js';
import { RegisterSession } from './register-session.entity.js';

@Entity({ name: 'register_cash_moves' })
@Index(['companyId', 'sessionId'])
export class RegisterCashMove extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => RegisterSession, (session) => session.cashMoves, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'session_id', referencedColumnName: 'id' },
  ])
  session?: Relation<RegisterSession>;

  @Column({ type: 'enum', enum: CashMoveKind, enumName: 'register_cash_move_kind' })
  kind!: CashMoveKind;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @Column({ type: 'varchar', length: 500 })
  note!: string;

  @Column({ name: 'created_by_name' })
  createdByName!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
