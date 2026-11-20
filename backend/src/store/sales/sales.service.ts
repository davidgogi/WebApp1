import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { AuditService } from '../../audit/audit.service.js';
import { AuthUser } from '../../auth/auth-user.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { nextDocumentNumber } from '../../common/document-number.js';
import { ProductUnit } from '../../wms/products/product-unit.enum.js';
import { StockMovementKind } from '../../wms/stock/stock-movement-kind.enum.js';
import { StockService } from '../../wms/stock/stock.service.js';
import { Warehouse } from '../../wms/warehouses/warehouse.entity.js';
import { CashRegisterService, saleCode } from '../cash-register/cash-register.service.js';
import { PaymentMethod } from '../cash-register/payment-method.enum.js';
import { SaleKind } from '../cash-register/sale-kind.enum.js';
import { SaleLine } from '../cash-register/sale-line.entity.js';
import { Sale } from '../cash-register/sale.entity.js';
import { PeriodQuery } from '../cash-register/dto/register.dto.js';
import { localDaySql, period, round2, round3 } from '../store-scope.js';
import { Store } from '../stores/store.entity.js';
import { CreateReturnDto } from './dto/sale.dto.js';

export interface SaleListItem {
  id: string;
  code: string;
  kind: SaleKind;
  createdAt: Date;
  storeId: string;
  storeName: string;
  registerNo: number;
  sessionId: string;
  createdByName: string;
  paymentMethod: PaymentMethod;
  total: number;
  lineCount: number;
  returnedTotal: number;
  original: { id: string; code: string } | null;
}

export interface SaleLineView {
  id: string;
  position: number;
  productId: string;
  productName: string;
  barcode: string;
  unit: ProductUnit;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  returnedQuantity: number;
}

export interface SaleDetail extends SaleListItem {
  cashierName: string;
  cashReceived: number | null;
  changeGiven: number | null;
  note: string | null;
  warehouse: { id: string; code: string; name: string };
  lines: SaleLineView[];
  returns: { id: string; code: string; createdAt: Date; total: number; createdByName: string }[];
  canReturn: boolean;
}

export interface NewSaleLine {
  productId: string;
  productName: string;
  barcode: string;
  unit: ProductUnit;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  originalLineId?: string | null;
}

const MAX_SALES = 5000;

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    @InjectRepository(SaleLine)
    private readonly linesRepository: Repository<SaleLine>,
    private readonly cashRegister: CashRegisterService,
    private readonly stock: StockService,
    private readonly audit: AuditService,
  ) {}

  async findAll(actor: AuthUser, query: PeriodQuery): Promise<SaleListItem[]> {
    const { from, to } = period(query.from, query.to, 7);
    const builder = this.visibleSales(actor)
      .andWhere(`${localDaySql('sale.created_at')} BETWEEN :from AND :to`, { from, to })
      .orderBy('sale.created_at', 'DESC')
      .take(MAX_SALES);
    if (query.storeId) {
      builder.andWhere('sale.store_id = :storeId', { storeId: query.storeId });
    }
    return this.toListItems(actor, await builder.getMany());
  }

  async findOne(actor: AuthUser, id: string): Promise<SaleDetail> {
    const sale = await this.visibleSales(actor)
      .leftJoinAndSelect('sale.lines', 'line')
      .leftJoinAndSelect('sale.warehouse', 'warehouse')
      .andWhere('sale.id = :id', { id })
      .orderBy('line.position', 'ASC')
      .getOne();
    if (!sale) {
      throw new NotFoundException(`Sale ${id} not found`);
    }
    const [item] = await this.toListItems(actor, [sale]);
    const returns =
      sale.kind === SaleKind.SALE
        ? await this.salesRepository.find({
            where: { companyId: actor.companyId!, originalSaleId: sale.id },
            order: { createdAt: 'ASC' },
          })
        : [];
    const returned = sale.kind === SaleKind.SALE ? await this.returnedByLine(this.salesRepository.manager, actor, sale.id) : new Map();
    const lines = sale.lines.map((line) => ({
      id: line.id,
      position: line.position,
      productId: line.productId,
      productName: line.productName,
      barcode: line.barcode,
      unit: line.unit,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      returnedQuantity: returned.get(line.id)?.quantity ?? 0,
    }));
    const somethingLeft = lines.some((line) => line.returnedQuantity < line.quantity);
    return {
      ...item,
      cashierName: sale.session!.cashierName,
      cashReceived: sale.cashReceived,
      changeGiven: sale.changeGiven,
      note: sale.note,
      warehouse: { id: sale.warehouse!.id, code: sale.warehouse!.code, name: sale.warehouse!.name },
      lines,
      returns: returns.map((r) => ({ id: r.id, code: saleCode(r), createdAt: r.createdAt, total: r.total, createdByName: r.createdByName })),
      canReturn:
        sale.kind === SaleKind.SALE &&
        somethingLeft &&
        actor.role === UserRole.MANAGER &&
        sale.session!.store.managerId === actor.employeeId,
    };
  }

  async record(
    manager: EntityManager,
    actor: AuthUser,
    document: {
      kind: SaleKind;
      sessionId: string;
      storeId: string;
      warehouseId: string;
      paymentMethod: PaymentMethod;
      cashReceived?: number | null;
      changeGiven?: number | null;
      originalSaleId?: string | null;
      note?: string | null;
      lines: NewSaleLine[];
    },
  ): Promise<Sale> {
    const total = round2(document.lines.reduce((sum, line) => sum + line.lineTotal, 0));
    const number = await nextDocumentNumber(manager, Sale, actor.companyId!, `sale-${document.kind}`, { kind: document.kind });
    const sale = await manager.save(
      manager.create(Sale, {
        companyId: actor.companyId!,
        kind: document.kind,
        number,
        sessionId: document.sessionId,
        storeId: document.storeId,
        warehouseId: document.warehouseId,
        originalSaleId: document.originalSaleId ?? null,
        paymentMethod: document.paymentMethod,
        total,
        cashReceived: document.cashReceived ?? null,
        changeGiven: document.changeGiven ?? null,
        note: document.note ?? null,
        createdByName: actor.displayName,
        lines: document.lines.map((line, index) => ({
          companyId: actor.companyId!,
          position: index + 1,
          productId: line.productId,
          productName: line.productName,
          barcode: line.barcode,
          unit: line.unit,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          originalLineId: line.originalLineId ?? null,
        })),
      }),
    );
    const sign = document.kind === SaleKind.SALE ? -1 : 1;
    await this.stock.post(
      manager,
      actor,
      document.lines.map((line) => ({ productId: line.productId, warehouseId: document.warehouseId, quantity: sign * line.quantity })),
      {
        kind: document.kind === SaleKind.SALE ? StockMovementKind.SALE : StockMovementKind.SALE_RETURN,
        documentId: sale.id,
        note: saleCode(sale),
      },
    );
    return sale;
  }

  async saleWarehouse(manager: EntityManager, actor: AuthUser, store: Store): Promise<Warehouse> {
    if (!store.warehouseId) {
      throw new BadRequestException(`${store.name} has no sales warehouse yet. Ask the Store admin to choose one.`);
    }
    return manager.findOneByOrFail(Warehouse, { id: store.warehouseId, companyId: actor.companyId! });
  }

  async returnSale(actor: AuthUser, id: string, dto: CreateReturnDto): Promise<SaleDetail> {
    const created = await this.salesRepository.manager.transaction(async (manager) => {
      const { session, store } = await this.cashRegister.openSessionForSale(manager, actor);
      const original = await manager.findOne(Sale, {
        where: { id, companyId: actor.companyId!, kind: SaleKind.SALE },
        lock: { mode: 'pessimistic_write' },
      });
      if (!original) {
        throw new NotFoundException(`Sale ${id} not found`);
      }
      if (original.storeId !== store.id) {
        throw new BadRequestException(`Goods are returned at a register of the store they were sold in, and your open register is in ${store.name}`);
      }
      const lines = await manager.find(SaleLine, { where: { companyId: actor.companyId!, saleId: original.id } });
      const linesById = new Map(lines.map((line) => [line.id, line]));
      const returned = await this.returnedByLine(manager, actor, original.id);
      const seen = new Set<string>();
      const newLines: NewSaleLine[] = [];
      for (const request of dto.lines) {
        const line = linesById.get(request.lineId);
        if (!line) {
          throw new BadRequestException('A returned line does not belong to this sale');
        }
        if (seen.has(line.id)) {
          throw new BadRequestException('Each line can be returned only once per return');
        }
        seen.add(line.id);
        if (line.unit === ProductUnit.PCS && !Number.isInteger(request.quantity)) {
          throw new BadRequestException(`${line.productName} is counted in pcs, so its quantity must be whole`);
        }
        const already = returned.get(line.id) ?? { quantity: 0, total: 0 };
        const left = round3(line.quantity - already.quantity);
        if (request.quantity > left) {
          throw new BadRequestException(`Only ${left} ${line.unit} of ${line.productName} can still be returned`);
        }
        newLines.push({
          productId: line.productId,
          productName: line.productName,
          barcode: line.barcode,
          unit: line.unit,
          quantity: request.quantity,
          unitPrice: line.unitPrice,
          lineTotal: request.quantity === left ? round2(line.lineTotal - already.total) : round2(request.quantity * line.unitPrice),
          originalLineId: line.id,
        });
      }
      return this.record(manager, actor, {
        kind: SaleKind.RETURN,
        sessionId: session.id,
        storeId: store.id,
        warehouseId: original.warehouseId,
        paymentMethod: original.paymentMethod,
        originalSaleId: original.id,
        note: dto.note || null,
        lines: newLines,
      }).then((sale) => ({ sale, original, store }));
    });
    await this.audit.record(
      actor,
      'sale.return',
      `${saleCode(created.sale)}: returned ₾${created.sale.total.toFixed(2)} of ${saleCode(created.original)} in ${created.store.name} (${created.sale.paymentMethod})`,
    );
    return this.findOne(actor, created.sale.id);
  }

  private visibleSales(actor: AuthUser): SelectQueryBuilder<Sale> {
    const query = this.salesRepository
      .createQueryBuilder('sale')
      .innerJoinAndSelect('sale.session', 'session')
      .innerJoinAndSelect('session.store', 'store')
      .leftJoinAndSelect('sale.originalSale', 'original')
      .where('sale.company_id = :companyId', { companyId: actor.companyId });
    if (actor.role === UserRole.CASHIER) {
      query.andWhere('session.cashier_id = :employeeId', { employeeId: actor.employeeId });
    } else if (actor.role === UserRole.MANAGER) {
      query.andWhere('(store.manager_id = :employeeId OR session.cashier_id = :employeeId)', { employeeId: actor.employeeId });
    }
    return query;
  }

  private async toListItems(actor: AuthUser, sales: Sale[]): Promise<SaleListItem[]> {
    const counts = new Map<string, number>();
    const returnedTotals = new Map<string, number>();
    if (sales.length > 0) {
      const ids = sales.map((sale) => sale.id);
      const [lineRows, returnRows] = await Promise.all([
        this.linesRepository
          .createQueryBuilder('line')
          .select('line.sale_id', 'saleId')
          .addSelect('COUNT(*)', 'count')
          .where('line.company_id = :companyId', { companyId: actor.companyId })
          .andWhere('line.sale_id IN (:...ids)', { ids })
          .groupBy('line.sale_id')
          .getRawMany<{ saleId: string; count: string }>(),
        this.salesRepository
          .createQueryBuilder('sale')
          .select('sale.original_sale_id', 'saleId')
          .addSelect('SUM(sale.total)', 'total')
          .where('sale.company_id = :companyId', { companyId: actor.companyId })
          .andWhere('sale.original_sale_id IN (:...ids)', { ids })
          .groupBy('sale.original_sale_id')
          .getRawMany<{ saleId: string; total: string }>(),
      ]);
      lineRows.forEach((row) => counts.set(row.saleId, Number(row.count)));
      returnRows.forEach((row) => returnedTotals.set(row.saleId, Number(row.total)));
    }
    return sales.map((sale) => ({
      id: sale.id,
      code: saleCode(sale),
      kind: sale.kind,
      createdAt: sale.createdAt,
      storeId: sale.storeId,
      storeName: sale.session!.store.name,
      registerNo: sale.session!.registerNo,
      sessionId: sale.sessionId,
      createdByName: sale.createdByName,
      paymentMethod: sale.paymentMethod,
      total: sale.total,
      lineCount: counts.get(sale.id) ?? 0,
      returnedTotal: returnedTotals.get(sale.id) ?? 0,
      original: sale.originalSale ? { id: sale.originalSale.id, code: saleCode(sale.originalSale) } : null,
    }));
  }

  private async returnedByLine(manager: EntityManager, actor: AuthUser, saleId: string): Promise<Map<string, { quantity: number; total: number }>> {
    const rows = await manager
      .createQueryBuilder(SaleLine, 'line')
      .innerJoin('line.sale', 'sale')
      .select('line.original_line_id', 'lineId')
      .addSelect('SUM(line.quantity)', 'quantity')
      .addSelect('SUM(line.line_total)', 'total')
      .where('line.company_id = :companyId', { companyId: actor.companyId })
      .andWhere('sale.original_sale_id = :saleId', { saleId })
      .groupBy('line.original_line_id')
      .getRawMany<{ lineId: string; quantity: string; total: string }>();
    return new Map(rows.map((row) => [row.lineId, { quantity: Number(row.quantity), total: Number(row.total) }]));
  }
}

