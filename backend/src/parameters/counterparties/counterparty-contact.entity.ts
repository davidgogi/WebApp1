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

@Entity({ name: 'counterparty_contacts' })
export class CounterpartyContact extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'counterparty_id', type: 'uuid' })
  counterpartyId!: string;

  @ManyToOne(() => Counterparty, (counterparty) => counterparty.contacts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'company_id', referencedColumnName: 'companyId' },
    { name: 'counterparty_id', referencedColumnName: 'id' },
  ])
  counterparty?: Relation<Counterparty>;

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
