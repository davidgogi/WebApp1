import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, type Relation } from 'typeorm';
import { decimalTransformer } from '../../common/decimal.transformer.js';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { Product } from '../../wms/products/product.entity.js';
import { ProductUnit } from '../../wms/products/product-unit.enum.js';
import { Sale } from './sale.entity.js';

const money = { type: 'numeric' as const, precision: 12, scale: 2, transformer: decimalTransformer };

@Entity({ name: 'sale_lines' })
@Unique(['companyId', 'id'])
export class SaleLine extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'sale_id', type: 'uuid' })
  saleId!: string;

  @ManyToOne(() => Sale, (sale) => sale.lines, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'sale_id', referencedColumnName: 'id' },
  ])
  sale?: Relation<Sale>;

  @Column({ type: 'int' })
  position!: number;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Relation<Product>;

  @Column({ name: 'product_name' })
  productName!: string;

  @Column()
  barcode!: string;

  @Column({ type: 'varchar', length: 3 })
  unit!: ProductUnit;

  @Column({ type: 'numeric', precision: 12, scale: 3, transformer: decimalTransformer })
  quantity!: number;

  @Column({ name: 'unit_price', ...money })
  unitPrice!: number;

  @Column({ name: 'line_total', ...money })
  lineTotal!: number;

  @Column({ name: 'original_line_id', type: 'uuid', nullable: true })
  originalLineId!: string | null;

  @ManyToOne(() => SaleLine, { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'original_line_id', referencedColumnName: 'id' },
  ])
  originalLine?: Relation<SaleLine> | null;
}
