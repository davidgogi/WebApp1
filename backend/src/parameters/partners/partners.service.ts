import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditService, AuditSource } from '../../audit/audit.service.js';
import { AuditLog } from '../../audit/audit-log.entity.js';
import { AuthUser } from '../../auth/auth-user.js';
import { isUniqueViolation } from '../../common/is-unique-violation.js';
import { nameKey, nameKeySql } from '../../common/name-key.js';
import { Product } from '../../wms/products/product.entity.js';
import { Receipt } from '../../wms/receipts/receipt.entity.js';
import {
  CreatePartnerDto,
  PartnerContactDto,
  UpdatePartnerDto,
} from './dto/partner.dto.js';
import { PartnerContact } from './partner-contact.entity.js';
import { Partner } from './partner.entity.js';
import { PartnerStatus } from './partner-status.enum.js';
import { PartnerType } from './partner-type.enum.js';

export type NewPartner = Pick<
  Partner,
  | 'name'
  | 'type'
  | 'isSupplier'
  | 'isClient'
  | 'identificationCode'
  | 'vatPayer'
  | 'contactPerson'
  | 'phone'
  | 'email'
  | 'address'
  | 'category'
  | 'note'
  | 'status'
>;

export type PartnerHistoryEntry = Pick<
  AuditLog,
  'id' | 'createdAt' | 'actorName' | 'action' | 'source'
>;

const STATUS_NAMES: Record<PartnerStatus, string> = {
  [PartnerStatus.ACTIVE]: 'Active',
  [PartnerStatus.INACTIVE]: 'Inactive',
};

type ContactFields = Pick<
  PartnerContact,
  'firstName' | 'lastName' | 'phone' | 'position' | 'email'
>;

const contactsKey = (contacts: ContactFields[]) =>
  JSON.stringify(
    contacts.map(({ firstName, lastName, phone, position, email }) => [
      firstName,
      lastName,
      phone,
      position,
      email,
    ]),
  );

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private readonly partnersRepository: Repository<Partner>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Receipt)
    private readonly receiptsRepository: Repository<Receipt>,
    private readonly audit: AuditService,
  ) {}

  async findAll(actor: AuthUser): Promise<Partner[]> {
    const partners = await this.partnersRepository.find({
      where: { companyId: actor.companyId! },
      relations: { contacts: true },
      order: { name: 'ASC', contacts: { createdAt: 'ASC' } },
    });
    const counts: { partnerId: string; count: string }[] =
      await this.productsRepository
        .createQueryBuilder('product')
        .select('product.supplier_id', 'partnerId')
        .addSelect('COUNT(*)', 'count')
        .where('product.company_id = :companyId', {
          companyId: actor.companyId,
        })
        .groupBy('product.supplier_id')
        .getRawMany();
    const receiptCounts: { partnerId: string; count: string }[] =
      await this.receiptsRepository
        .createQueryBuilder('receipt')
        .select('receipt.supplier_id', 'partnerId')
        .addSelect('COUNT(*)', 'count')
        .where('receipt.company_id = :companyId', {
          companyId: actor.companyId,
        })
        .andWhere('receipt.supplier_id IS NOT NULL')
        .groupBy('receipt.supplier_id')
        .getRawMany();
    const byId = new Map(
      counts.map((row) => [row.partnerId, Number(row.count)]),
    );
    const receiptsById = new Map(
      receiptCounts.map((row) => [row.partnerId, Number(row.count)]),
    );
    return partners.map((partner) =>
      Object.assign(partner, {
        productCount: byId.get(partner.id) ?? 0,
        receiptCount: receiptsById.get(partner.id) ?? 0,
      }),
    );
  }

  supplierOptions(
    actor: AuthUser,
  ): Promise<Pick<Partner, 'id' | 'name' | 'identificationCode'>[]> {
    return this.partnersRepository.find({
      select: { id: true, name: true, identificationCode: true },
      where: {
        companyId: actor.companyId!,
        status: PartnerStatus.ACTIVE,
        isSupplier: true,
      },
      order: { name: 'ASC' },
    });
  }

  async categories(actor: AuthUser): Promise<string[]> {
    const rows: { category: string }[] = await this.partnersRepository
      .createQueryBuilder('partner')
      .select('DISTINCT partner.category', 'category')
      .where('partner.company_id = :companyId', { companyId: actor.companyId })
      .andWhere("COALESCE(partner.category, '') <> ''")
      .orderBy('category')
      .getRawMany();
    return rows.map((row) => row.category);
  }

  async history(actor: AuthUser, id: string): Promise<PartnerHistoryEntry[]> {
    await this.findEntity(actor, id);
    const entries = await this.audit.history(actor, id, 'partner');
    return entries.map(({ id, createdAt, actorName, action, source }) => ({
      id,
      createdAt,
      actorName,
      action,
      source,
    }));
  }

  async create(actor: AuthUser, dto: CreatePartnerDto): Promise<Partner> {
    const { contacts = [], source = 'form', note, ...fields } = dto;
    await this.assertNameFree(actor, fields.name);
    const partner = this.partnersRepository.create({
      ...fields,
      note: note || null,
      companyId: actor.companyId!,
    });
    this.assertCodeFitsType(partner);
    this.assertHasRole(partner);
    const saved = await this.save(partner, actor, contacts);
    await this.audit.record(
      actor,
      'partner.create',
      `Created counterparty ${saved.name}`,
      undefined,
      { entityId: saved.id, source },
    );
    return Object.assign(saved, { productCount: 0, receiptCount: 0 });
  }

  async createMany(actor: AuthUser, rows: NewPartner[]): Promise<Partner[]> {
    const saved = await this.partnersRepository.manager.transaction(
      async (manager) => {
        const created: Partner[] = [];
        for (const row of rows) {
          try {
            created.push(
              await manager.save(
                manager.create(Partner, {
                  ...row,
                  companyId: actor.companyId!,
                }),
              ),
            );
          } catch (error) {
            if (isUniqueViolation(error)) {
              throw new ConflictException(
                `Identification code ${row.identificationCode} is already used by another counterparty`,
              );
            }
            throw error;
          }
        }
        return created;
      },
    );
    await this.audit.record(
      actor,
      'partner.import',
      `Imported ${saved.length} counterparties`,
      undefined,
      { source: 'import' },
    );
    await this.audit.recordMany(
      actor,
      saved.map((partner) => ({
        action: 'partner.import',
        summary: `Imported counterparty ${partner.name}`,
        entityId: partner.id,
        source: 'import',
      })),
    );
    return saved;
  }

  async update(
    actor: AuthUser,
    id: string,
    dto: UpdatePartnerDto,
    source: AuditSource = 'form',
  ): Promise<Partner> {
    const { contacts, ...given } = dto;
    const partner = await this.findEntity(actor, id);
    const fields = {
      ...given,
      ...(given.note !== undefined && { note: given.note || null }),
    };

    if (fields.name && nameKey(fields.name) !== nameKey(partner.name)) {
      await this.assertNameFree(actor, fields.name, id);
    }

    const sent = Object.entries(fields).filter(
      ([, value]) => value !== undefined,
    ) as [keyof Partner, unknown][];
    const statusBefore = partner.status;
    const fieldsChanged = sent.some(
      ([key, value]) => key !== 'status' && partner[key] !== value,
    );
    const contactsChanged =
      contacts !== undefined &&
      contactsKey(contacts) !==
        contactsKey(
          await this.partnersRepository.manager.find(PartnerContact, {
            where: { companyId: actor.companyId!, partnerId: id },
            order: { createdAt: 'ASC' },
          }),
        );

    Object.assign(partner, Object.fromEntries(sent));

    this.assertCodeFitsType(partner);
    this.assertHasRole(partner);
    const productCount = await this.productCount(actor, id);
    const receiptCount = await this.receiptCount(actor, id);
    if (!partner.isSupplier && productCount + receiptCount > 0) {
      throw new ConflictException(
        `${partner.name} is the supplier on products or receipts, so it must stay a supplier`,
      );
    }
    const saved = await this.save(partner, actor, contacts);
    const statusChanged = saved.status !== statusBefore;
    if (statusChanged) {
      await this.audit.record(
        actor,
        'partner.status',
        `Set counterparty ${saved.name} to ${STATUS_NAMES[saved.status]}`,
        undefined,
        { entityId: saved.id, source },
      );
    }
    if (fieldsChanged || contactsChanged || !statusChanged) {
      await this.audit.record(
        actor,
        'partner.update',
        `Updated counterparty ${saved.name}`,
        undefined,
        { entityId: saved.id, source },
      );
    }
    return Object.assign(saved, { productCount, receiptCount });
  }

  async remove(actor: AuthUser, id: string): Promise<void> {
    const partner = await this.findEntity(actor, id);
    const count = await this.productCount(actor, id);
    if (count > 0) {
      throw new ConflictException(
        `${partner.name} supplies ${count} ${count === 1 ? 'product' : 'products'}, so it can't be deleted. Move them to another supplier or set it to Inactive.`,
      );
    }
    if ((await this.receiptCount(actor, id)) > 0) {
      throw new ConflictException(
        `${partner.name} is on receipts, so it can't be deleted. Set it to Inactive instead.`,
      );
    }
    await this.partnersRepository.remove(partner);
    await this.audit.record(
      actor,
      'partner.delete',
      `Deleted counterparty ${partner.name}`,
      undefined,
      { entityId: id, source: 'form' },
    );
  }

  async markAsSupplier(actor: AuthUser, partner: Partner): Promise<void> {
    if (partner.isSupplier) {
      return;
    }
    partner.isSupplier = true;
    await this.partnersRepository.save(partner);
    await this.audit.record(
      actor,
      'partner.supplier',
      `Marked ${partner.name} as a supplier (first receipt from it)`,
      undefined,
      { entityId: partner.id, source: 'rs' },
    );
  }

  private assertHasRole(partner: Partner): void {
    if (!partner.isSupplier && !partner.isClient) {
      throw new BadRequestException('Choose at least one: Supplier or Client');
    }
  }

  private assertCodeFitsType(partner: Partner): void {
    const code = partner.identificationCode;
    if (code && partner.type === PartnerType.COMPANY && code.length !== 9) {
      throw new BadRequestException(
        "A company's identification code has 9 digits",
      );
    }
    if (code && partner.type === PartnerType.INDIVIDUAL && code.length !== 11) {
      throw new BadRequestException(
        "An individual's identification code is the 11-digit personal ID",
      );
    }
  }

  private async save(
    partner: Partner,
    actor: AuthUser,
    contacts?: PartnerContactDto[],
  ): Promise<Partner> {
    try {
      return await this.partnersRepository.manager.transaction(
        async (manager) => {
          const saved = await manager.save(partner);
          saved.contacts = await this.saveContacts(
            manager,
            actor,
            saved.id,
            contacts,
          );
          return saved;
        },
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Identification code ${partner.identificationCode} is already used by another counterparty`,
        );
      }
      throw error;
    }
  }

  private async saveContacts(
    manager: EntityManager,
    actor: AuthUser,
    partnerId: string,
    contacts?: PartnerContactDto[],
  ): Promise<PartnerContact[]> {
    const where = { companyId: actor.companyId!, partnerId };
    if (contacts === undefined) {
      return manager.find(PartnerContact, {
        where,
        order: { createdAt: 'ASC' },
      });
    }
    await manager.delete(PartnerContact, where);
    const saved: PartnerContact[] = [];
    for (const contact of contacts) {
      saved.push(
        await manager.save(manager.create(PartnerContact, { ...contact, ...where })),
      );
    }
    return saved;
  }

  private productCount(actor: AuthUser, partnerId: string): Promise<number> {
    return this.productsRepository.countBy({
      companyId: actor.companyId!,
      supplierId: partnerId,
    });
  }

  private receiptCount(actor: AuthUser, partnerId: string): Promise<number> {
    return this.receiptsRepository.countBy({
      companyId: actor.companyId!,
      supplierId: partnerId,
    });
  }

  private async findEntity(actor: AuthUser, id: string): Promise<Partner> {
    const partner = await this.partnersRepository.findOneBy({
      id,
      companyId: actor.companyId!,
    });
    if (!partner) {
      throw new NotFoundException(`Counterparty ${id} not found`);
    }
    return partner;
  }

  private async assertNameFree(
    actor: AuthUser,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const query = this.partnersRepository
      .createQueryBuilder('partner')
      .where('partner.company_id = :companyId', { companyId: actor.companyId })
      .andWhere(`${nameKeySql('partner.name')} = :key`, {
        key: nameKey(name),
      });
    if (exceptId) {
      query.andWhere('partner.id <> :exceptId', { exceptId });
    }
    const existing = await query.getOne();
    if (existing) {
      throw new ConflictException(
        `A counterparty named "${existing.name}" already exists`,
      );
    }
  }
}
