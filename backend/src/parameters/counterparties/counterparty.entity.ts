import {
  AfterLoad,
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
import { CounterpartyContact } from './counterparty-contact.entity.js';
import { formatDocumentNumber } from '../../common/document-number.js';
import { decimalTransformer } from '../../common/decimal.transformer.js';
import { CounterpartyStatus } from './counterparty-status.enum.js';
import { LegalForm } from './legal-form.enum.js';
import { OrganizationType } from './organization-type.enum.js';

@Entity({ name: 'counterparties' })
@Unique(['companyId', 'id'])
@Unique(['companyId', 'identificationCode'])
@Unique(['companyId', 'number'])
@Check('"is_supplier" OR "is_client"')
export class Counterparty extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  number!: number;

  code?: string;

  @Column()
  name!: string;

  @Column({
    name: 'organization_type',
    type: 'enum',
    enum: OrganizationType,
    default: OrganizationType.COMPANY,
  })
  organizationType!: OrganizationType;

  @Column({ name: 'legal_form', type: 'enum', enum: LegalForm, nullable: true })
  legalForm!: LegalForm | null;

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

  @Column({ name: 'actual_address', type: 'varchar', nullable: true })
  actualAddress!: string | null;

  @Column({ type: 'varchar', nullable: true })
  category!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'is_supplier', default: false })
  isSupplier!: boolean;

  @Column({ name: 'is_client', default: false })
  isClient!: boolean;

  @Column({ name: 'deferred_payment_days', type: 'int', nullable: true })
  deferredPaymentDays!: number | null;

  @Column({
    name: 'discount_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  discountPercent!: number | null;

  @Column({
    name: 'credit_limit',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  creditLimit!: number | null;

  @Column({ name: 'supplier_payment_days', type: 'int', nullable: true })
  supplierPaymentDays!: number | null;

  @Column({ name: 'delivery_days', type: 'int', nullable: true })
  deliveryDays!: number | null;

  @Column({ name: 'bank_account', type: 'varchar', nullable: true })
  bankAccount!: string | null;

  @Column({ type: 'enum', enum: CounterpartyStatus, default: CounterpartyStatus.ACTIVE })
  status!: CounterpartyStatus;

  @OneToMany(() => CounterpartyContact, (contact) => contact.counterparty)
  contacts?: Relation<CounterpartyContact>[];

  productCount?: number;

  receiptCount?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @AfterLoad()
  setCode(): void {
    this.code = formatDocumentNumber('CP', this.number);
  }
}
