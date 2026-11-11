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
import { Partner } from './partner.entity.js';

@Entity({ name: 'partner_contacts' })
export class PartnerContact extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'partner_id', type: 'uuid' })
  partnerId!: string;

  @ManyToOne(() => Partner, (partner) => partner.contacts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'partner_id', referencedColumnName: 'id' },
  ])
  partner?: Relation<Partner>;

  @Column({ name: 'first_name' })
  firstName!: string;

  @Column({ name: 'last_name' })
  lastName!: string;

  @Column()
  phone!: string;

  @Column()
  position!: string;

  @Column()
  email!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
