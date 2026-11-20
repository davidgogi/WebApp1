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
import { Warehouse } from '../../wms/warehouses/warehouse.entity.js';
import { Store } from '../stores/store.entity.js';
import { PaymentMethod } from './payment-method.enum.js';
import { RegisterSession } from './register-session.entity.js';
import { SaleKind } from './sale-kind.enum.js';
import { SaleLine } from './sale-line.entity.js';

const money = { type: 'numeric' as const, precision: 12, scale: 2, transformer: decimalTransformer };

@Entity({ name: 'sales' })
@Unique(['companyId', 'id'])
@Unique(['companyId', 'kind', 'number'])
@Index(['companyId', 'storeId', 'createdAt'])
@Index(['companyId', 'sessionId'])
@Index(['companyId', 'originalSaleId'])
export class Sale extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: SaleKind, enumName: 'sale_kind' })
  kind!: SaleKind;

  @Column({ type: 'int' })
  number!: number;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => RegisterSession, (session) => session.sales, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'session_id', referencedColumnName: 'id' },
  ])
  session?: Relation<RegisterSession>;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'store_id', referencedColumnName: 'id' },
  ])
  store?: Relation<Store>;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'warehouse_id', referencedColumnName: 'id' },
  ])
  warehouse?: Relation<Warehouse>;

  @Column({ name: 'original_sale_id', type: 'uuid', nullable: true })
  originalSaleId!: string | null;

  @ManyToOne(() => Sale, { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'original_sale_id', referencedColumnName: 'id' },
  ])
  originalSale?: Relation<Sale> | null;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod, enumName: 'payment_method' })
  paymentMethod!: PaymentMethod;

  @Column(money)
  total!: number;

  @Column({ name: 'cash_received', ...money, nullable: true })
  cashReceived!: number | null;

  @Column({ name: 'change_given', ...money, nullable: true })
  changeGiven!: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note!: string | null;

  @Column({ name: 'created_by_name' })
  createdByName!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => SaleLine, (line) => line.sale, { cascade: true })
  lines!: Relation<SaleLine>[];
}
