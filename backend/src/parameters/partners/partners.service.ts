import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service.js';
import { AuthUser } from '../../auth/auth-user.js';
import { isUniqueViolation } from '../../common/is-unique-violation.js';
import { nameKey, nameKeySql } from '../../common/name-key.js';
import { Product } from '../../wms/products/product.entity.js';
import { Receipt } from '../../wms/receipts/receipt.entity.js';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto.js';
import { Partner } from './partner.entity.js';
import { PartnerStatus } from './partner-status.enum.js';
import { PartnerType } from './partner-type.enum.js';

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
      order: { name: 'ASC' },
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

  async create(actor: AuthUser, dto: CreatePartnerDto): Promise<Partner> {
    await this.assertNameFree(actor, dto.name);
    const partner = this.partnersRepository.create({
      ...dto,
      companyId: actor.companyId!,
    });
    this.assertCodeFitsType(partner);
    this.assertHasRole(partner);
    const saved = await this.save(partner);
    await this.audit.record(
      actor,
      'partner.create',
      `Created partner ${saved.name}`,
    );
    return Object.assign(saved, { productCount: 0, receiptCount: 0 });
  }

  async update(
    actor: AuthUser,
    id: string,
    dto: UpdatePartnerDto,
  ): Promise<Partner> {
    const partner = await this.findEntity(actor, id);

    if (dto.name && nameKey(dto.name) !== nameKey(partner.name)) {
      await this.assertNameFree(actor, dto.name, id);
    }

    Object.assign(
      partner,
      Object.fromEntries(
        Object.entries(dto).filter(([, value]) => value !== undefined),
      ),
    );

    this.assertCodeFitsType(partner);
    this.assertHasRole(partner);
    const productCount = await this.productCount(actor, id);
    const receiptCount = await this.receiptCount(actor, id);
    if (!partner.isSupplier && productCount + receiptCount > 0) {
      throw new ConflictException(
        `${partner.name} is the supplier on products or receipts, so it must stay a supplier`,
      );
    }
    const saved = await this.save(partner);
    await this.audit.record(
      actor,
      'partner.update',
      `Updated partner ${saved.name}`,
    );
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
      `Deleted partner ${partner.name}`,
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
      'partner.update',
      `Marked ${partner.name} as a supplier (first receipt from it)`,
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

  private async save(partner: Partner): Promise<Partner> {
    try {
      return await this.partnersRepository.save(partner);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Identification code ${partner.identificationCode} is already used by another partner`,
        );
      }
      throw error;
    }
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
      throw new NotFoundException(`Partner ${id} not found`);
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
        `A partner named "${existing.name}" already exists`,
      );
    }
  }
}
