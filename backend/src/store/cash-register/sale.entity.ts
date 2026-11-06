import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { decimalTransformer } from '../../common/decimal.transformer.js';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { RegisterSession } from './register-session.entity.js';
import { SaleLine } from './sale-line.entity.js';

@Entity({ name: 'sales' })
@Unique(['companyId', 'id'])
export class Sale extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => RegisterSession, (session) => session.sales, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'session_id', referencedColumnName: 'id' },
  ])
  session!: Relation<RegisterSession>;

  @Column({ type: 'int' })
  number!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  total!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => SaleLine, (line) => line.sale, { cascade: true })
  lines!: SaleLine[];
}
