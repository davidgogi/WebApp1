import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { decimalTransformer } from '../../common/decimal.transformer.js';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { Sale } from './sale.entity.js';

@Entity({ name: 'sale_lines' })
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
  sale!: Relation<Sale>;

  @Column({ name: 'product_name' })
  productName!: string;

  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  unitPrice!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'line_total', type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  lineTotal!: number;
}
