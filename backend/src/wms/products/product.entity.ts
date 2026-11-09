import {
  Column,
  CreateDateColumn,
  AfterLoad,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { decimalTransformer } from '../../common/decimal.transformer.js';
import { Category } from '../categories/category.entity.js';
import { ProductGroup } from '../categories/product-group.entity.js';
import { ProductWarehouse } from '../stock/product-warehouse.entity.js';
import { Partner } from '../../parameters/partners/partner.entity.js';
import { ProductPosStatus } from './product-pos-status.enum.js';
import { ProductStatus } from './product-status.enum.js';
import { ProductUnit } from './product-unit.enum.js';
import { ProductUsage } from './product-usage.enum.js';

@Entity({ name: 'products' })
@Unique(['companyId', 'barcode'])
export class Product extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  barcode!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: Pick<Category, 'id' | 'name' | 'status'>;

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId!: string | null;

  @ManyToOne(() => ProductGroup, { nullable: true })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'group_id', referencedColumnName: 'id' },
  ])
  group?: Pick<ProductGroup, 'id' | 'name' | 'status'> | null;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @ManyToOne(() => Partner, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Pick<Partner, 'id' | 'name' | 'status'>;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status!: ProductStatus;

  @Column({ type: 'enum', enum: ProductUsage })
  usage!: ProductUsage;

  @Column({ name: 'pos_status', type: 'enum', enum: ProductPosStatus, default: ProductPosStatus.STORAGE })
  posStatus!: ProductPosStatus;

  @Column({ type: 'enum', enum: ProductUnit, default: ProductUnit.PCS })
  unit!: ProductUnit;

  @Column({ name: 'cost_price', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  costPrice!: number;

  @Column({ name: 'sale_price', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  salePrice!: number;

  @OneToMany(() => ProductWarehouse, (stock) => stock.product)
  stocks!: Relation<ProductWarehouse>[];

  quantity!: number;

  @AfterLoad()
  computeQuantity(): void {
    if (this.stocks) {
      this.quantity = Math.round(this.stocks.reduce((sum, s) => sum + s.quantity, 0) * 1000) / 1000;
    }
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
