import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { WarehouseStatus } from './warehouse-status.enum.js';
import { WarehouseType } from './warehouse-type.enum.js';

@Entity({ name: 'warehouses' })
export class Warehouse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  // Generated from the type: WH-MAIN-01, WH-SALE-01, WH-SALE-02, ...
  @Column({ unique: true })
  code!: string;

  @Column({ type: 'enum', enum: WarehouseType })
  type!: WarehouseType;

  // Names of the branches this warehouse serves. May become a relation once a Branches module exists.
  @Column({ type: 'text', array: true, default: '{}' })
  branches!: string[];

  @Column()
  address!: string;

  // Total units held, entered by hand until products exist.
  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ type: 'enum', enum: WarehouseStatus, default: WarehouseStatus.ACTIVE })
  status!: WarehouseStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
