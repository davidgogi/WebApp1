import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/auth-user.js';
import { UserRole } from '../auth/user-role.enum.js';
import { AuditLog } from './audit-log.entity.js';

export type AuditSource = 'form' | 'import' | 'rs';

export interface AuditDetails {
  entityId?: string;
  source?: AuditSource;
}

export interface AuditEntry extends AuditDetails {
  action: string;
  summary: string;
}

const DETAIL_ROW = `NOT (audit.action = 'partner.import' AND audit.entity_id IS NOT NULL)`;

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async record(
    actor: AuthUser,
    action: string,
    summary: string,
    companyId?: string | null,
    details: AuditDetails = {},
  ): Promise<void> {
    await this.auditRepository.save(
      this.entry(actor, { action, summary, ...details }, companyId),
    );
  }

  async recordMany(actor: AuthUser, entries: AuditEntry[]): Promise<void> {
    if (entries.length) {
      await this.auditRepository.save(
        entries.map((entry) => this.entry(actor, entry)),
        { chunk: 200 },
      );
    }
  }

  find(actor: AuthUser, limit = 200): Promise<AuditLog[]> {
    const query = this.auditRepository
      .createQueryBuilder('audit')
      .where(DETAIL_ROW)
      .orderBy('audit.created_at', 'DESC')
      .take(limit);
    if (actor.role !== UserRole.SUPERUSER) {
      query.andWhere('audit.company_id = :companyId', {
        companyId: actor.companyId,
      });
    }
    return query.getMany();
  }

  history(
    actor: AuthUser,
    entityId: string,
    actionPrefix: string,
  ): Promise<AuditLog[]> {
    return this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.company_id = :companyId', { companyId: actor.companyId })
      .andWhere('audit.entity_id = :entityId', { entityId })
      .andWhere('audit.action LIKE :prefix', { prefix: `${actionPrefix}.%` })
      .orderBy('audit.created_at', 'DESC')
      .getMany();
  }

  private entry(
    actor: AuthUser,
    { action, summary, entityId, source }: AuditEntry,
    companyId?: string | null,
  ): AuditLog {
    return this.auditRepository.create({
      companyId: companyId === undefined ? actor.companyId : companyId,
      actorName: actor.displayName,
      actorRole: actor.role,
      action,
      summary,
      entityId: entityId ?? null,
      source: source ?? null,
    });
  }
}
