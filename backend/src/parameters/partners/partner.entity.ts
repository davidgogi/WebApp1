import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { PartnerContact } from './partner-contact.entity.js';
import { PartnerStatus } from './partner-status.enum.js';
import { PartnerType } from './partner-type.enum.js';

@Entity({ name: 'partners' })
@Unique(['companyId', 'id'])
@Unique(['companyId', 'identificationCode'])
@Check('"is_supplier" OR "is_client"')
export class Partner extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: PartnerType, default: PartnerType.COMPANY })
  type!: PartnerType;

  @Column({ name: 'identification_code', type: 'varchar', nullable: true })
  identificationCode!: string | null;

  @Column({ name: 'vat_payer', default: false })
  vatPayer!: boolean;

  @Column({ name: 'contact_person', type: 'varchar', nullable: true })
  contactPerson!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', nullable: true })
  category!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'is_supplier', default: false })
  isSupplier!: boolean;

  @Column({ name: 'is_client', default: false })
  isClient!: boolean;

  @Column({ type: 'enum', enum: PartnerStatus, default: PartnerStatus.ACTIVE })
  status!: PartnerStatus;

  @OneToMany(() => PartnerContact, (contact) => contact.partner)
  contacts?: Relation<PartnerContact>[];

  productCount?: number;

  receiptCount?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
