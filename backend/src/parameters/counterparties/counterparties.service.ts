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
  CreateCounterpartyDto,
  CounterpartyContactDto,
  UpdateCounterpartyDto,
} from './dto/counterparty.dto.js';
import { CounterpartyContact } from './counterparty-contact.entity.js';
import { Counterparty } from './counterparty.entity.js';
import { CounterpartyStatus } from './counterparty-status.enum.js';
import { OrganizationType } from './organization-type.enum.js';
import { LEGAL_FORMS_BY_TYPE } from './legal-form.enum.js';
import { nextDocumentNumber } from '../../common/document-number.js';
import { isValidIban, normalizeIban } from '../../common/iban.js';

export type NewCounterparty = Pick<
  Counterparty,
  | 'name'
  | 'organizationType'
  | 'isSupplier'
  | 'isClient'
  | 'deferredPaymentDays'
  | 'legalForm'
  | 'actualAddress'
  | 'discountPercent'
  | 'creditLimit'
  | 'supplierPaymentDays'
  | 'deliveryDays'
  | 'bankAccount'
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

export type CounterpartyHistoryEntry = Pick<
  AuditLog,
  'id' | 'createdAt' | 'actorName' | 'action' | 'source'
>;

const STATUS_NAMES: Record<CounterpartyStatus, string> = {
  [CounterpartyStatus.ACTIVE]: 'Active',
  [CounterpartyStatus.INACTIVE]: 'Inactive',
};

type ContactFields = Pick<
  CounterpartyContact,
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
export class CounterpartiesService {
  constructor(
    @InjectRepository(Counterparty)
    private readonly counterpartiesRepository: Repository<Counterparty>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Receipt)
    private readonly receiptsRepository: Repository<Receipt>,
    private readonly audit: AuditService,
  ) {}

  async findAll(actor: AuthUser): Promise<Counterparty[]> {
    const counterparties = await this.counterpartiesRepository.find({
      where: { companyId: actor.companyId! },
      relations: { contacts: true },
      order: { name: 'ASC', contacts: { createdAt: 'ASC' } },
    });
    const counts: { counterpartyId: string; count: string }[] =
      await this.productsRepository
        .createQueryBuilder('product')
        .select('product.supplier_id', 'counterpartyId')
        .addSelect('COUNT(*)', 'count')
        .where('product.company_id = :companyId', {
          companyId: actor.companyId,
        })
        .groupBy('product.supplier_id')
        .getRawMany();
    const receiptCounts: { counterpartyId: string; count: string }[] =
      await this.receiptsRepository
        .createQueryBuilder('receipt')
        .select('receipt.supplier_id', 'counterpartyId')
        .addSelect('COUNT(*)', 'count')
        .where('receipt.company_id = :companyId', {
          companyId: actor.companyId,
        })
        .andWhere('receipt.supplier_id IS NOT NULL')
        .groupBy('receipt.supplier_id')
        .getRawMany();
    const byId = new Map(
      counts.map((row) => [row.counterpartyId, Number(row.count)]),
    );
    const receiptsById = new Map(
      receiptCounts.map((row) => [row.counterpartyId, Number(row.count)]),
    );
    return counterparties.map((counterparty) =>
      Object.assign(counterparty, {
        productCount: byId.get(counterparty.id) ?? 0,
        receiptCount: receiptsById.get(counterparty.id) ?? 0,
      }),
    );
  }

  async findOne(actor: AuthUser, id: string): Promise<Counterparty> {
    const counterparty = await this.counterpartiesRepository.findOne({
      where: { id, companyId: actor.companyId! },
      relations: { contacts: true },
      order: { contacts: { createdAt: 'ASC' } },
    });
    if (!counterparty) {
      throw new NotFoundException(`Counterparty ${id} not found`);
    }
    return Object.assign(counterparty, {
      productCount: await this.productCount(actor, id),
      receiptCount: await this.receiptCount(actor, id),
    });
  }

  supplierOptions(
    actor: AuthUser,
  ): Promise<Pick<Counterparty, 'id' | 'name' | 'identificationCode'>[]> {
    return this.counterpartiesRepository.find({
      select: { id: true, name: true, identificationCode: true },
      where: {
        companyId: actor.companyId!,
        status: CounterpartyStatus.ACTIVE,
        isSupplier: true,
      },
      order: { name: 'ASC' },
    });
  }

  async categories(actor: AuthUser): Promise<string[]> {
    const rows: { category: string }[] = await this.counterpartiesRepository
      .createQueryBuilder('counterparty')
      .select('DISTINCT counterparty.category', 'category')
      .where('counterparty.company_id = :companyId', { companyId: actor.companyId })
      .andWhere("COALESCE(counterparty.category, '') <> ''")
      .orderBy('category')
      .getRawMany();
    return rows.map((row) => row.category);
  }

  async history(actor: AuthUser, id: string): Promise<CounterpartyHistoryEntry[]> {
    await this.findEntity(actor, id);
    const entries = await this.audit.history(actor, id, 'counterparty');
    return entries.map(({ id, createdAt, actorName, action, source }) => ({
      id,
      createdAt,
      actorName,
      action,
      source,
    }));
  }

  async create(actor: AuthUser, dto: CreateCounterpartyDto): Promise<Counterparty> {
    const { contacts = [], source = 'form', note, ...fields } = dto;
    await this.assertNameFree(actor, fields.name);
    const counterparty = this.counterpartiesRepository.create({
      ...fields,
      note: note || null,
      companyId: actor.companyId!,
    });
    this.assertCodeFitsOrganizationType(counterparty);
    this.assertHasCounterpartyType(counterparty);
    this.applyDetailRules(counterparty, dto.legalForm !== undefined);
    const saved = await this.save(counterparty, actor, contacts);
    await this.audit.record(
      actor,
      'counterparty.create',
      `Created counterparty ${saved.name}`,
      undefined,
      { entityId: saved.id, source },
    );
    return Object.assign(saved, { productCount: 0, receiptCount: 0 });
  }

  async createMany(actor: AuthUser, rows: NewCounterparty[]): Promise<Counterparty[]> {
    const saved = await this.counterpartiesRepository.manager.transaction(
      async (manager) => {
        const created: Counterparty[] = [];
        let number = await nextDocumentNumber(
          manager,
          Counterparty,
          actor.companyId!,
          'counterparty',
        );
        for (const row of rows) {
          try {
            const counterparty = await manager.save(
              manager.create(Counterparty, {
                ...row,
                number: number++,
                companyId: actor.companyId!,
              }),
            );
            counterparty.setCode();
            created.push(counterparty);
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
      'counterparty.import',
      `Imported ${saved.length} counterparties`,
      undefined,
      { source: 'import' },
    );
    await this.audit.recordMany(
      actor,
      saved.map((counterparty) => ({
        action: 'counterparty.import',
        summary: `Imported counterparty ${counterparty.name}`,
        entityId: counterparty.id,
        source: 'import',
      })),
    );
    return saved;
  }

  async update(
    actor: AuthUser,
    id: string,
    dto: UpdateCounterpartyDto,
    source: AuditSource = 'form',
  ): Promise<Counterparty> {
    const { contacts, ...given } = dto;
    const counterparty = await this.findEntity(actor, id);
    const fields = {
      ...given,
      ...(given.note !== undefined && { note: given.note || null }),
    };

    if (fields.name && nameKey(fields.name) !== nameKey(counterparty.name)) {
      await this.assertNameFree(actor, fields.name, id);
    }

    const sent = Object.entries(fields).filter(
      ([, value]) => value !== undefined,
    ) as [keyof Counterparty, unknown][];
    const statusBefore = counterparty.status;
    const fieldsChanged = sent.some(
      ([key, value]) => key !== 'status' && counterparty[key] !== value,
    );
    const contactsChanged =
      contacts !== undefined &&
      contactsKey(contacts) !==
        contactsKey(
          await this.counterpartiesRepository.manager.find(CounterpartyContact, {
            where: { companyId: actor.companyId!, counterpartyId: id },
            order: { createdAt: 'ASC' },
          }),
        );

    Object.assign(counterparty, Object.fromEntries(sent));

    this.assertCodeFitsOrganizationType(counterparty);
    this.assertHasCounterpartyType(counterparty);
    this.applyDetailRules(counterparty, given.legalForm !== undefined);
    const productCount = await this.productCount(actor, id);
    const receiptCount = await this.receiptCount(actor, id);
    if (!counterparty.isSupplier && productCount + receiptCount > 0) {
      throw new ConflictException(
        `${counterparty.name} is the supplier on products or receipts, so it must stay a supplier`,
      );
    }
    const saved = await this.save(counterparty, actor, contacts);
    const statusChanged = saved.status !== statusBefore;
    if (statusChanged) {
      await this.audit.record(
        actor,
        'counterparty.status',
        `Set counterparty ${saved.name} to ${STATUS_NAMES[saved.status]}`,
        undefined,
        { entityId: saved.id, source },
      );
    }
    if (fieldsChanged || contactsChanged || !statusChanged) {
      await this.audit.record(
        actor,
        'counterparty.update',
        `Updated counterparty ${saved.name}`,
        undefined,
        { entityId: saved.id, source },
      );
    }
    return Object.assign(saved, { productCount, receiptCount });
  }

  async remove(actor: AuthUser, id: string): Promise<void> {
    const counterparty = await this.findEntity(actor, id);
    const count = await this.productCount(actor, id);
    if (count > 0) {
      throw new ConflictException(
        `${counterparty.name} supplies ${count} ${count === 1 ? 'product' : 'products'}, so it can't be deleted. Move them to another supplier or set it to Inactive.`,
      );
    }
    if ((await this.receiptCount(actor, id)) > 0) {
      throw new ConflictException(
        `${counterparty.name} is on receipts, so it can't be deleted. Set it to Inactive instead.`,
      );
    }
    await this.counterpartiesRepository.remove(counterparty);
    await this.audit.record(
      actor,
      'counterparty.delete',
      `Deleted counterparty ${counterparty.name}`,
      undefined,
      { entityId: id, source: 'form' },
    );
  }

  async markAsSupplier(actor: AuthUser, counterparty: Counterparty): Promise<void> {
    if (counterparty.isSupplier) {
      return;
    }
    counterparty.isSupplier = true;
    await this.counterpartiesRepository.save(counterparty);
    await this.audit.record(
      actor,
      'counterparty.supplier',
      `Marked ${counterparty.name} as a supplier (first receipt from it)`,
      undefined,
      { entityId: counterparty.id, source: 'rs' },
    );
  }

  private applyDetailRules(counterparty: Counterparty, legalFormSent: boolean): void {
    const forms = LEGAL_FORMS_BY_TYPE[counterparty.organizationType];
    if (counterparty.legalForm && !forms.includes(counterparty.legalForm)) {
      if (legalFormSent) {
        throw new BadRequestException(
          "This legal form doesn't fit the organization type",
        );
      }
      counterparty.legalForm = null;
    }
    counterparty.actualAddress = counterparty.actualAddress || null;
    if (counterparty.bankAccount) {
      const iban = normalizeIban(counterparty.bankAccount);
      if (!isValidIban(iban)) {
        throw new BadRequestException(
          'The bank account must be a valid IBAN, e.g. GE29NB0000000101904917',
        );
      }
      counterparty.bankAccount = iban;
    } else {
      counterparty.bankAccount = null;
    }
    if (!counterparty.isClient) {
      counterparty.deferredPaymentDays = null;
      counterparty.discountPercent = null;
      counterparty.creditLimit = null;
    }
    if (!counterparty.isSupplier) {
      counterparty.supplierPaymentDays = null;
      counterparty.deliveryDays = null;
      counterparty.bankAccount = null;
    }
  }

  private assertHasCounterpartyType(counterparty: Counterparty): void {
    if (!counterparty.isSupplier && !counterparty.isClient) {
      throw new BadRequestException('Choose at least one: Supplier or Client');
    }
  }

  private assertCodeFitsOrganizationType(counterparty: Counterparty): void {
    const code = counterparty.identificationCode;
    if (code && counterparty.organizationType === OrganizationType.COMPANY && code.length !== 9) {
      throw new BadRequestException(
        "A company's identification code has 9 digits",
      );
    }
    if (code && counterparty.organizationType === OrganizationType.INDIVIDUAL && code.length !== 11) {
      throw new BadRequestException(
        "An individual's identification code is the 11-digit personal ID",
      );
    }
  }

  private async save(
    counterparty: Counterparty,
    actor: AuthUser,
    contacts?: CounterpartyContactDto[],
  ): Promise<Counterparty> {
    try {
      return await this.counterpartiesRepository.manager.transaction(
        async (manager) => {
          if (counterparty.number === undefined) {
            counterparty.number = await nextDocumentNumber(
              manager,
              Counterparty,
              actor.companyId!,
              'counterparty',
            );
          }
          const saved = await manager.save(counterparty);
          saved.setCode();
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
          `Identification code ${counterparty.identificationCode} is already used by another counterparty`,
        );
      }
      throw error;
    }
  }

  private async saveContacts(
    manager: EntityManager,
    actor: AuthUser,
    counterpartyId: string,
    contacts?: CounterpartyContactDto[],
  ): Promise<CounterpartyContact[]> {
    const where = { companyId: actor.companyId!, counterpartyId };
    if (contacts === undefined) {
      return manager.find(CounterpartyContact, {
        where,
        order: { createdAt: 'ASC' },
      });
    }
    await manager.delete(CounterpartyContact, where);
    const saved: CounterpartyContact[] = [];
    for (const contact of contacts) {
      saved.push(
        await manager.save(manager.create(CounterpartyContact, { ...contact, ...where })),
      );
    }
    return saved;
  }

  private productCount(actor: AuthUser, counterpartyId: string): Promise<number> {
    return this.productsRepository.countBy({
      companyId: actor.companyId!,
      supplierId: counterpartyId,
    });
  }

  private receiptCount(actor: AuthUser, counterpartyId: string): Promise<number> {
    return this.receiptsRepository.countBy({
      companyId: actor.companyId!,
      supplierId: counterpartyId,
    });
  }

  private async findEntity(actor: AuthUser, id: string): Promise<Counterparty> {
    const counterparty = await this.counterpartiesRepository.findOneBy({
      id,
      companyId: actor.companyId!,
    });
    if (!counterparty) {
      throw new NotFoundException(`Counterparty ${id} not found`);
    }
    return counterparty;
  }

  private async assertNameFree(
    actor: AuthUser,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const query = this.counterpartiesRepository
      .createQueryBuilder('counterparty')
      .where('counterparty.company_id = :companyId', { companyId: actor.companyId })
      .andWhere(`${nameKeySql('counterparty.name')} = :key`, {
        key: nameKey(name),
      });
    if (exceptId) {
      query.andWhere('counterparty.id <> :exceptId', { exceptId });
    }
    const existing = await query.getOne();
    if (existing) {
      throw new ConflictException(
        `A counterparty named "${existing.name}" already exists`,
      );
    }
  }
}
