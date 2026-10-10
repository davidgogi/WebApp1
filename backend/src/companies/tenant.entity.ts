import { Column, JoinColumn, ManyToOne } from 'typeorm';
import { Company } from './company.entity.js';

// Base class for every table that belongs to one company. Every query on such a table must
// filter by `companyId`; deleting the company deletes its rows.
export abstract class TenantEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;
}
