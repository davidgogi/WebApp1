import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { TenantEntity } from '../../companies/tenant.entity.js';
import { Counterparty } from './counterparty.entity.js';
import { CounterpartyDocumentType } from './counterparty-document-type.enum.js';

@Entity({ name: 'counterparty_documents' })
export class CounterpartyDocument extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'counterparty_id', type: 'uuid' })
  counterpartyId!: string;

  @ManyToOne(() => Counterparty, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'counterparty_id', referencedColumnName: 'id' },
  ])
  counterparty?: Relation<Counterparty>;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: CounterpartyDocumentType })
  type!: CounterpartyDocumentType;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil!: string | null;

  @Column({ name: 'mime_type' })
  mimeType!: string;

  @Column({ type: 'int' })
  size!: number;

  @Column({ type: 'bytea', select: false })
  content!: Buffer;

  @Column({ name: 'uploaded_by_name' })
  uploadedByName!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
