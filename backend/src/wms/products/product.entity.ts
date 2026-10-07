import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/decimal.transformer.js';
import { Warehouse } from '../warehouses/warehouse.entity.js';
import { ProductUnit } from './product-unit.enum.js';

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  sku!: string;

  // Plain text for now; may become a relation once Categories / Suppliers modules exist.
  @Column()
  category!: string;

  @Column()
  supplier!: string;

  // Total quantity in `unit`. Up to 3 decimals so kg amounts like 12.5 fit.
  @Column({ type: 'numeric', precision: 12, scale: 3, default: 0, transformer: decimalTransformer })
  amount!: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit!: ProductUnit;

  // Warehouses where this product can be found. Deleting a warehouse only removes the link.
  @ManyToMany(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'product_warehouses',
    joinColumn: { name: 'product_id' },
    inverseJoinColumn: { name: 'warehouse_id' },
  })
  warehouses!: Warehouse[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
