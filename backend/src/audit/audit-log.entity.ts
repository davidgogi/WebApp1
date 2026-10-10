import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Who did what, and when. Plain columns (no foreign keys) so entries outlive what they describe.
@Entity({ name: 'audit_log' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Null for platform-level actions that belong to no company (e.g. the superuser logging in).
  @Index()
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId!: string | null;

  @Column({ name: 'actor_name' })
  actorName!: string;

  @Column({ name: 'actor_role' })
  actorRole!: string;

  // Dotted name, e.g. 'employee.create'.
  @Column()
  action!: string;

  @Column({ type: 'text' })
  summary!: string;
}
