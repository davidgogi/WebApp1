import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../../common/decimal.transformer.js';
import { TenantEntity } from '../../companies/tenant.entity.js';

// An item the POS can sell. Separate from the WMS products on purpose: the modules are
// independent, and a shop's selling catalog is not its warehouse stock.
@Entity({ name: 'store_products' })
export class StoreProduct extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  price!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
