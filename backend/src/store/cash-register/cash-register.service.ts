import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { AuditService } from '../../audit/audit.service.js';
import { AuthUser } from '../../auth/auth-user.js';
import { hashPassword, verifyPassword } from '../../auth/password.js';
import { User } from '../../auth/user.entity.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { formatDocumentNumber, nextDocumentNumber } from '../../common/document-number.js';
import { isUniqueViolation } from '../../common/is-unique-violation.js';
import { dayInStore, localDaySql, period, round2 } from '../store-scope.js';
import { Expense } from '../expenses/expense.entity.js';
import { ExpenseSource } from '../expenses/expense-source.enum.js';
import { ExpenseStatus } from '../expenses/expense-status.enum.js';
import { StoreEmployee } from '../stores/store-employee.entity.js';
import { Store } from '../stores/store.entity.js';
import { CashMoveKind } from './cash-move-kind.enum.js';
import { CoverageStatus } from './coverage-status.enum.js';
import { PaymentMethod } from './payment-method.enum.js';
import { RegisterCashMove } from './register-cash-move.entity.js';
import { RegisterSession } from './register-session.entity.js';
import { SaleKind } from './sale-kind.enum.js';
import { Sale } from './sale.entity.js';
import { ShortageCoverage } from './shortage-coverage.entity.js';
import { CashMoveDto, CloseRegisterDto, CommentDto, CoverageDto, OpenRegisterDto, PeriodQuery, PinDto } from './dto/register.dto.js';

export interface SessionMetrics {
  salesCount: number;
  returnsCount: number;
  cashSales: number;
  cardSales: number;
  cashReturns: number;
  cardReturns: number;
  cashIn: number;
  cashOut: number;
  expenses: number;
  netSales: number;
  expectedCash: number;
  covered: number;
}

export interface SessionView {
  id: string;
  storeId: string;
  storeName: string;
  registerNo: number;
  cashierName: string;
  openedAt: Date;
  closedAt: Date | null;
  status: 'open' | 'closed';
  openingCash: number;
  openNote: string | null;
  countedCash: number | null;
  expectedCash: number;
  variance: number | null;
  closeNote: string | null;
  closedByName: string | null;
  coverageStatus: CoverageStatus | null;
  shortageLeft: number;
  metrics: SessionMetrics;
  mine: boolean;
  canClose: boolean;
  canMoveCash: boolean;
  canComment: boolean;
  canCover: boolean;
}

export type ActivityType = 'open' | 'sale' | 'return' | 'cash_in' | 'cash_out' | 'expense' | 'close';

export interface ActivityRow {
  at: Date;
  type: ActivityType;
  code: string | null;
  saleId: string | null;
  expenseId: string | null;
  paymentMethod: PaymentMethod | null;
  amount: number;
  cashEffect: number;
  balanceBefore: number;
  balanceAfter: number;
  by: string;
  note: string | null;
}

export interface CoverageView {
  id: string;
  code: string;
  expenseCode: string | null;
  amount: number;
  note: string | null;
  coveredByName: string;
  createdAt: Date;
}

export interface SessionDetail extends SessionView {
  activity: ActivityRow[];
  coverages: CoverageView[];
}

export interface RegisterAvailability {
  no: number;
  inUseBy: string | null;
}

const MAX_SESSIONS = 1000;

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectRepository(RegisterSession)
    private readonly sessionsRepository: Repository<RegisterSession>,
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    @InjectRepository(RegisterCashMove)
    private readonly cashMovesRepository: Repository<RegisterCashMove>,
    @InjectRepository(ShortageCoverage)
    private readonly coveragesRepository: Repository<ShortageCoverage>,
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    @InjectRepository(StoreEmployee)
    private readonly storeEmployeesRepository: Repository<StoreEmployee>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly audit: AuditService,
  ) {}

  async pinStatus(actor: AuthUser): Promise<{ hasPin: boolean }> {
    return { hasPin: !!(await this.pinHashOf(actor)) };
  }

  async setPin(actor: AuthUser, dto: PinDto): Promise<{ hasPin: boolean }> {
    const current = await this.pinHashOf(actor);
    if (current && !verifyPassword(dto.currentPin ?? '', current)) {
      throw new BadRequestException('The current PIN is wrong');
    }
    await this.usersRepository.update({ id: actor.userId, companyId: actor.companyId! }, { pinHash: hashPassword(dto.newPin) });
    await this.audit.record(actor, 'register.pin', current ? 'Changed their register PIN' : 'Set their register PIN');
    return { hasPin: true };
  }

  async findAll(actor: AuthUser, query: PeriodQuery): Promise<SessionView[]> {
    const { from, to } = period(query.from, query.to);
    const builder = this.visibleSessions(actor)
      .andWhere(`${localDaySql('session.opened_at')} BETWEEN :from AND :to`, { from, to })
      .orderBy('session.opened_at', 'DESC')
      .take(MAX_SESSIONS);
    if (query.storeId) {
      builder.andWhere('session.store_id = :storeId', { storeId: query.storeId });
    }
    return this.toViews(actor, await builder.getMany());
  }

  async findOne(actor: AuthUser, id: string): Promise<SessionDetail> {
    const session = await this.visibleSessions(actor).andWhere('session.id = :id', { id }).getOne();
    if (!session) {
      throw new NotFoundException(`Register session ${id} not found`);
    }
    const [view] = await this.toViews(actor, [session]);
    const [sales, moves, coverages, expenses] = await Promise.all([
      this.salesRepository.find({
        where: { companyId: actor.companyId!, sessionId: id },
        order: { createdAt: 'ASC' },
      }),
      this.cashMovesRepository.find({
        where: { companyId: actor.companyId!, sessionId: id },
        order: { createdAt: 'ASC' },
      }),
      this.coveragesRepository.find({
        where: { companyId: actor.companyId!, sessionId: id },
        relations: { expense: true },
        order: { createdAt: 'ASC' },
      }),
      this.expensesRepository.find({
        where: { companyId: actor.companyId!, sessionId: id, status: ExpenseStatus.ACTIVE, source: ExpenseSource.CASH },
        relations: { type: true },
        order: { createdAt: 'ASC' },
      }),
    ]);
    return {
      ...view,
      activity: activityOf(session, sales, moves, expenses),
      coverages: coverages.map((coverage) => ({
        id: coverage.id,
        code: formatDocumentNumber('CV', coverage.number),
        expenseCode: coverage.expense ? formatDocumentNumber('EX', coverage.expense.number) : null,
        amount: coverage.amount,
        note: coverage.note,
        coveredByName: coverage.coveredByName,
        createdAt: coverage.createdAt,
      })),
    };
  }

  async current(actor: AuthUser): Promise<SessionDetail | null> {
    if (!actor.employeeId) {
      return null;
    }
    const session = await this.sessionsRepository.findOne({
      select: { id: true },
      where: { companyId: actor.companyId!, cashierId: actor.employeeId, closedAt: IsNull() },
    });
    return session ? this.findOne(actor, session.id) : null;
  }

  async registers(actor: AuthUser, storeId: string): Promise<RegisterAvailability[]> {
    const store = await this.storeIWorkIn(actor, storeId);
    const open = await this.sessionsRepository.find({
      where: { companyId: actor.companyId!, storeId: store.id, closedAt: IsNull() },
    });
    return Array.from({ length: store.registers }, (_, index) => ({
      no: index + 1,
      inUseBy: open.find((session) => session.registerNo === index + 1)?.cashierName ?? null,
    }));
  }

  async open(actor: AuthUser, dto: OpenRegisterDto): Promise<SessionDetail> {
    await this.verifyPin(actor, dto.pin);
    if (await this.current(actor)) {
      throw new BadRequestException('You already have a register open. Close it first.');
    }
    const store = await this.storeIWorkIn(actor, dto.storeId);
    if (!store.warehouseId) {
      throw new BadRequestException(`${store.name} has no sales warehouse yet. Ask the Store admin to choose one.`);
    }
    if (dto.registerNo > store.registers) {
      throw new BadRequestException(`${store.name} has ${store.registers} register${store.registers === 1 ? '' : 's'}`);
    }
    const taken = await this.sessionsRepository.findOne({
      where: { companyId: actor.companyId!, storeId: store.id, registerNo: dto.registerNo, closedAt: IsNull() },
    });
    if (taken) {
      throw new ConflictException(`Register ${dto.registerNo} is already open (${taken.cashierName})`);
    }

    let session: RegisterSession;
    try {
      session = await this.sessionsRepository.save(
        this.sessionsRepository.create({
          companyId: actor.companyId!,
          storeId: store.id,
          cashierId: actor.employeeId,
          cashierName: actor.displayName,
          registerNo: dto.registerNo,
          openingCash: dto.openingCash,
          openNote: dto.note || null,
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Register ${dto.registerNo} was just opened by someone else`);
      }
      throw error;
    }
    await this.audit.record(
      actor,
      'register.open',
      `Opened register ${dto.registerNo} in ${store.name} with ₾${dto.openingCash.toFixed(2)}`,
    );
    return this.findOne(actor, session.id);
  }

  async close(actor: AuthUser, id: string, dto: CloseRegisterDto): Promise<SessionDetail> {
    await this.verifyPin(actor, dto.pin);
    const closed = await this.sessionsRepository.manager.transaction(async (manager) => {
      const { session, store } = await this.lockSession(manager, actor, id);
      if (session.closedAt) {
        throw new BadRequestException('This register is already closed');
      }
      if (!this.isOwner(actor, session) && !this.isStoreManager(actor, store)) {
        throw new ForbiddenException('Only the person who opened this register or the store manager can close it');
      }
      const metrics = (await this.metricsFor(manager, actor, [session])).get(session.id)!;
      const difference = round2(dto.countedCash - metrics.expectedCash);
      if (difference !== 0 && !dto.note) {
        throw new BadRequestException('The counted cash differs from the expected cash, so write a note');
      }
      await manager.update(
        RegisterSession,
        { id: session.id, companyId: actor.companyId! },
        {
          closedAt: new Date(),
          countedCash: dto.countedCash,
          expectedCash: metrics.expectedCash,
          variance: difference,
          closeNote: dto.note || null,
          closedByName: actor.displayName,
          coverageStatus: difference < 0 ? CoverageStatus.UNCOVERED : null,
        },
      );
      return { difference, store, session };
    });
    await this.audit.record(
      actor,
      'register.close',
      `Closed register ${closed.session.registerNo} in ${closed.store.name} (${closed.session.cashierName}), counted ₾${dto.countedCash.toFixed(2)}, difference ₾${closed.difference.toFixed(2)}`,
    );
    return this.findOne(actor, id);
  }

  async moveCash(actor: AuthUser, id: string, dto: CashMoveDto): Promise<SessionDetail> {
    const store = await this.sessionsRepository.manager.transaction(async (manager) => {
      const { session, store } = await this.lockSession(manager, actor, id);
      if (session.closedAt) {
        throw new BadRequestException('This register is already closed');
      }
      if (!this.isOwner(actor, session)) {
        throw new ForbiddenException('Only the person who opened this register can add or take out cash');
      }
      if (dto.kind === CashMoveKind.OUT) {
        const metrics = (await this.metricsFor(manager, actor, [session])).get(session.id)!;
        if (dto.amount > metrics.expectedCash) {
          throw new BadRequestException(`Only ₾${metrics.expectedCash.toFixed(2)} should be in the register`);
        }
      }
      await manager.save(
        manager.create(RegisterCashMove, {
          companyId: actor.companyId!,
          sessionId: session.id,
          kind: dto.kind,
          amount: dto.amount,
          note: dto.note,
          createdByName: actor.displayName,
        }),
      );
      return store;
    });
    await this.audit.record(
      actor,
      dto.kind === CashMoveKind.IN ? 'register.cash_in' : 'register.cash_out',
      `${dto.kind === CashMoveKind.IN ? 'Added' : 'Took out'} ₾${dto.amount.toFixed(2)} in ${store.name}: ${dto.note}`,
    );
    return this.findOne(actor, id);
  }

  async comment(actor: AuthUser, id: string, dto: CommentDto): Promise<SessionDetail> {
    const view = await this.findOne(actor, id);
    if (!view.canComment) {
      throw new ForbiddenException('You cannot change the comment of this register');
    }
    const comment = dto.comment || null;
    await this.sessionsRepository.update(
      { id, companyId: actor.companyId! },
      comment === null ? { openNote: null, closeNote: null } : view.closedAt ? { closeNote: comment } : { openNote: comment },
    );
    await this.audit.record(actor, 'register.comment', `Changed the comment of register ${view.registerNo} in ${view.storeName}`);
    return this.findOne(actor, id);
  }

  async cover(actor: AuthUser, id: string, dto: CoverageDto): Promise<SessionDetail> {
    const summary = await this.sessionsRepository.manager.transaction(async (manager) => {
      const { session, store } = await this.lockSession(manager, actor, id);
      return (await this.coverLocked(manager, actor, session, store, dto.amount, { note: dto.note })).summary;
    });
    await this.audit.record(actor, 'register.cover', `Covered ₾${dto.amount.toFixed(2)} of a shortage: ${summary}`);
    return this.findOne(actor, id);
  }

  async coverLocked(
    manager: EntityManager,
    actor: AuthUser,
    session: RegisterSession,
    store: Store,
    amount: number,
    details: {
      note: string | null;
      purpose?: string;
      categoryId?: string | null;
      typeId?: string | null;
      supplierId?: string | null;
      supplierName?: string | null;
    },
  ): Promise<{ expenseId: string; summary: string }> {
    if (!this.isStoreManager(actor, store) && actor.role !== UserRole.MODULE_ADMIN) {
      throw new ForbiddenException('Only the store manager or the Store admin can cover a shortage');
    }
    if (!session.closedAt) {
      throw new BadRequestException('A shortage can only be covered after the register is closed');
    }
    if ((session.variance ?? 0) >= 0) {
      throw new BadRequestException('This register has no shortage');
    }
    const covered = await this.coveredAmount(manager, actor, session.id);
    const shortage = round2(-session.variance!);
    const left = round2(shortage - covered);
    if (left <= 0) {
      throw new BadRequestException('This shortage is already covered');
    }
    if (amount > left) {
      throw new BadRequestException(`At most ₾${left.toFixed(2)} of the shortage is left to cover`);
    }
    const expenseNumber = await nextDocumentNumber(manager, Expense, actor.companyId!, 'expense');
    const expense = await manager.save(
      manager.create(Expense, {
        companyId: actor.companyId!,
        number: expenseNumber,
        storeId: session.storeId,
        source: ExpenseSource.SHORTAGE,
        sessionId: session.id,
        bankAccountId: null,
        categoryId: details.categoryId ?? null,
        typeId: details.typeId ?? null,
        supplierId: details.supplierId ?? null,
        supplierName: details.supplierName ?? null,
        expenseDate: dayInStore(session.openedAt),
        amount,
        purpose: details.purpose || details.note || `Shortage of register ${session.registerNo} (${session.cashierName})`,
        createdByName: actor.displayName,
      }),
    );
    const number = await nextDocumentNumber(manager, ShortageCoverage, actor.companyId!, 'shortage-coverage');
    await manager.save(
      manager.create(ShortageCoverage, {
        companyId: actor.companyId!,
        sessionId: session.id,
        expenseId: expense.id,
        number,
        amount,
        note: details.note,
        coveredByName: actor.displayName,
      }),
    );
    await manager.update(
      RegisterSession,
      { id: session.id, companyId: actor.companyId! },
      { coverageStatus: round2(covered + amount) >= shortage ? CoverageStatus.COVERED : CoverageStatus.PARTLY_COVERED },
    );
    return {
      expenseId: expense.id,
      summary: `${formatDocumentNumber('CV', number)}, expense ${formatDocumentNumber('EX', expenseNumber)} (register ${session.registerNo} in ${store.name}, ${session.cashierName})`,
    };
  }

  async uncoverLocked(manager: EntityManager, actor: AuthUser, session: RegisterSession, expenseId: string): Promise<void> {
    await manager.delete(ShortageCoverage, { companyId: actor.companyId!, expenseId });
    const covered = await this.coveredAmount(manager, actor, session.id);
    const shortage = round2(-(session.variance ?? 0));
    await manager.update(
      RegisterSession,
      { id: session.id, companyId: actor.companyId! },
      {
        coverageStatus:
          covered <= 0 ? CoverageStatus.UNCOVERED : covered >= shortage ? CoverageStatus.COVERED : CoverageStatus.PARTLY_COVERED,
      },
    );
  }

  async lockOwnOpenSession(manager: EntityManager, actor: AuthUser): Promise<{ session: RegisterSession; store: Store }> {
    const session = actor.employeeId
      ? await manager.findOne(RegisterSession, {
          where: { companyId: actor.companyId!, cashierId: actor.employeeId, closedAt: IsNull() },
          lock: { mode: 'pessimistic_write' },
        })
      : null;
    if (!session) {
      throw new BadRequestException('Open a register first (Store → Cash register)');
    }
    const store = await manager.findOneByOrFail(Store, { id: session.storeId, companyId: actor.companyId! });
    return { session, store };
  }

  async expectedCashOf(manager: EntityManager, actor: AuthUser, session: RegisterSession): Promise<number> {
    return (await this.metricsFor(manager, actor, [session])).get(session.id)!.expectedCash;
  }

  async openSessionForSale(
    manager: EntityManager,
    actor: AuthUser,
    lock = true,
  ): Promise<{ session: RegisterSession; store: Store }> {
    const session = actor.employeeId
      ? await manager.findOne(RegisterSession, {
          where: { companyId: actor.companyId!, cashierId: actor.employeeId, closedAt: IsNull() },
          ...(lock ? { lock: { mode: 'pessimistic_read' as const } } : {}),
        })
      : null;
    if (!session) {
      throw new BadRequestException('Open a register first (Store → Cash register)');
    }
    const store = await manager.findOneByOrFail(Store, { id: session.storeId, companyId: actor.companyId! });
    return { session, store };
  }

  visibleSessions(actor: AuthUser): SelectQueryBuilder<RegisterSession> {
    const query = this.sessionsRepository
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.store', 'store')
      .where('session.company_id = :companyId', { companyId: actor.companyId });
    if (actor.role === UserRole.CASHIER) {
      query.andWhere('session.cashier_id = :employeeId', { employeeId: actor.employeeId });
    } else if (actor.role === UserRole.MANAGER) {
      query.andWhere('(store.manager_id = :employeeId OR session.cashier_id = :employeeId)', { employeeId: actor.employeeId });
    }
    return query;
  }

  async toViews(actor: AuthUser, sessions: RegisterSession[]): Promise<SessionView[]> {
    const metrics = await this.metricsFor(this.sessionsRepository.manager, actor, sessions);
    return sessions.map((session) => {
      const values = metrics.get(session.id)!;
      const closed = !!session.closedAt;
      const owner = this.isOwner(actor, session);
      const storeManager = this.isStoreManager(actor, session.store);
      const shortageLeft = closed && (session.variance ?? 0) < 0 ? round2(-session.variance! - values.covered) : 0;
      return {
        id: session.id,
        storeId: session.storeId,
        storeName: session.store.name,
        registerNo: session.registerNo,
        cashierName: session.cashierName,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        status: closed ? 'closed' : 'open',
        openingCash: session.openingCash,
        openNote: session.openNote,
        countedCash: session.countedCash,
        expectedCash: closed && session.expectedCash !== null ? session.expectedCash : values.expectedCash,
        variance: session.variance,
        closeNote: session.closeNote,
        closedByName: session.closedByName,
        coverageStatus: session.coverageStatus,
        shortageLeft,
        metrics: values,
        mine: owner,
        canClose: !closed && (owner || storeManager),
        canMoveCash: !closed && owner,
        canComment: owner || storeManager || actor.role === UserRole.MODULE_ADMIN,
        canCover: shortageLeft > 0 && (storeManager || actor.role === UserRole.MODULE_ADMIN),
      };
    });
  }

  private async metricsFor(manager: EntityManager, actor: AuthUser, sessions: RegisterSession[]): Promise<Map<string, SessionMetrics>> {
    const result = new Map<string, SessionMetrics>();
    for (const session of sessions) {
      result.set(session.id, {
        salesCount: 0,
        returnsCount: 0,
        cashSales: 0,
        cardSales: 0,
        cashReturns: 0,
        cardReturns: 0,
        cashIn: 0,
        cashOut: 0,
        expenses: 0,
        netSales: 0,
        expectedCash: session.openingCash,
        covered: 0,
      });
    }
    if (sessions.length === 0) {
      return result;
    }
    const ids = sessions.map((session) => session.id);
    const companyId = actor.companyId;
    const [sales, moves, coverages, expenses] = await Promise.all([
      manager
        .createQueryBuilder(Sale, 'sale')
        .select('sale.session_id', 'sessionId')
        .addSelect('sale.kind', 'kind')
        .addSelect('sale.payment_method', 'method')
        .addSelect('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(sale.total), 0)', 'total')
        .where('sale.company_id = :companyId', { companyId })
        .andWhere('sale.session_id IN (:...ids)', { ids })
        .groupBy('sale.session_id')
        .addGroupBy('sale.kind')
        .addGroupBy('sale.payment_method')
        .getRawMany<{ sessionId: string; kind: SaleKind; method: PaymentMethod; count: string; total: string }>(),
      manager
        .createQueryBuilder(RegisterCashMove, 'move')
        .select('move.session_id', 'sessionId')
        .addSelect('move.kind', 'kind')
        .addSelect('COALESCE(SUM(move.amount), 0)', 'total')
        .where('move.company_id = :companyId', { companyId })
        .andWhere('move.session_id IN (:...ids)', { ids })
        .groupBy('move.session_id')
        .addGroupBy('move.kind')
        .getRawMany<{ sessionId: string; kind: CashMoveKind; total: string }>(),
      manager
        .createQueryBuilder(ShortageCoverage, 'coverage')
        .select('coverage.session_id', 'sessionId')
        .addSelect('COALESCE(SUM(coverage.amount), 0)', 'total')
        .where('coverage.company_id = :companyId', { companyId })
        .andWhere('coverage.session_id IN (:...ids)', { ids })
        .groupBy('coverage.session_id')
        .getRawMany<{ sessionId: string; total: string }>(),
      manager
        .createQueryBuilder(Expense, 'expense')
        .select('expense.session_id', 'sessionId')
        .addSelect('COALESCE(SUM(expense.amount), 0)', 'total')
        .where('expense.company_id = :companyId', { companyId })
        .andWhere('expense.session_id IN (:...ids)', { ids })
        .andWhere('expense.status = :active', { active: ExpenseStatus.ACTIVE })
        .andWhere('expense.source = :cash', { cash: ExpenseSource.CASH })
        .groupBy('expense.session_id')
        .getRawMany<{ sessionId: string; total: string }>(),
    ]);
    for (const row of sales) {
      const metrics = result.get(row.sessionId)!;
      const total = Number(row.total);
      const cash = row.method === PaymentMethod.CASH;
      if (row.kind === SaleKind.SALE) {
        metrics.salesCount += Number(row.count);
        if (cash) metrics.cashSales = total;
        else metrics.cardSales = total;
      } else {
        metrics.returnsCount += Number(row.count);
        if (cash) metrics.cashReturns = total;
        else metrics.cardReturns = total;
      }
    }
    for (const row of moves) {
      const metrics = result.get(row.sessionId)!;
      if (row.kind === CashMoveKind.IN) metrics.cashIn = Number(row.total);
      else metrics.cashOut = Number(row.total);
    }
    for (const row of coverages) {
      result.get(row.sessionId)!.covered = Number(row.total);
    }
    for (const row of expenses) {
      result.get(row.sessionId)!.expenses = Number(row.total);
    }
    for (const session of sessions) {
      const metrics = result.get(session.id)!;
      metrics.netSales = round2(metrics.cashSales + metrics.cardSales - metrics.cashReturns - metrics.cardReturns);
      metrics.expectedCash = round2(
        session.openingCash + metrics.cashSales - metrics.cashReturns + metrics.cashIn - metrics.cashOut - metrics.expenses,
      );
    }
    return result;
  }

  private async coveredAmount(manager: EntityManager, actor: AuthUser, sessionId: string): Promise<number> {
    const row = await manager
      .createQueryBuilder(ShortageCoverage, 'coverage')
      .select('COALESCE(SUM(coverage.amount), 0)', 'total')
      .where('coverage.company_id = :companyId', { companyId: actor.companyId })
      .andWhere('coverage.session_id = :sessionId', { sessionId })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  async lockSession(manager: EntityManager, actor: AuthUser, id: string): Promise<{ session: RegisterSession; store: Store }> {
    const visible = await this.visibleSessions(actor).andWhere('session.id = :id', { id }).getOne();
    if (!visible) {
      throw new NotFoundException(`Register session ${id} not found`);
    }
    const session = await manager.findOneOrFail(RegisterSession, {
      where: { id, companyId: actor.companyId! },
      lock: { mode: 'pessimistic_write' },
    });
    session.store = visible.store;
    return { session, store: visible.store };
  }

  private async storeIWorkIn(actor: AuthUser, storeId: string): Promise<Store> {
    const store = await this.storesRepository.findOne({ where: { id: storeId, companyId: actor.companyId! } });
    const allowed =
      store &&
      (actor.role === UserRole.MANAGER
        ? store.managerId === actor.employeeId
        : actor.role === UserRole.CASHIER &&
          !!actor.employeeId &&
          (await this.storeEmployeesRepository.existsBy({
            companyId: actor.companyId!,
            storeId: store.id,
            employeeId: actor.employeeId,
          })));
    if (!store || !allowed) {
      throw new ForbiddenException('You do not work in that store');
    }
    return store;
  }

  private async pinHashOf(actor: AuthUser): Promise<string | null> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.pinHash')
      .where('user.id = :id', { id: actor.userId })
      .andWhere('user.company_id = :companyId', { companyId: actor.companyId })
      .getOne();
    return user?.pinHash ?? null;
  }

  private async verifyPin(actor: AuthUser, pin: string): Promise<void> {
    const hash = await this.pinHashOf(actor);
    if (!hash) {
      throw new BadRequestException('Set your register PIN first');
    }
    if (!verifyPassword(pin, hash)) {
      throw new BadRequestException('The PIN is wrong');
    }
  }

  private isOwner(actor: AuthUser, session: RegisterSession): boolean {
    return !!actor.employeeId && session.cashierId === actor.employeeId;
  }

  private isStoreManager(actor: AuthUser, store: Store): boolean {
    return actor.role === UserRole.MANAGER && !!actor.employeeId && store.managerId === actor.employeeId;
  }
}

export function saleCode(sale: Pick<Sale, 'kind' | 'number'>): string {
  return formatDocumentNumber(sale.kind === SaleKind.SALE ? 'S' : 'R', sale.number);
}

function activityOf(session: RegisterSession, sales: Sale[], moves: RegisterCashMove[], expenses: Expense[]): ActivityRow[] {
  const events: Omit<ActivityRow, 'balanceBefore' | 'balanceAfter'>[] = [
    {
      at: session.openedAt,
      type: 'open',
      code: null,
      saleId: null,
      expenseId: null,
      paymentMethod: null,
      amount: session.openingCash,
      cashEffect: session.openingCash,
      by: session.cashierName,
      note: session.openNote,
    },
  ];
  for (const sale of sales) {
    const cash = sale.paymentMethod === PaymentMethod.CASH;
    const sign = sale.kind === SaleKind.SALE ? 1 : -1;
    events.push({
      at: sale.createdAt,
      type: sale.kind === SaleKind.SALE ? 'sale' : 'return',
      code: saleCode(sale),
      saleId: sale.id,
      expenseId: null,
      paymentMethod: sale.paymentMethod,
      amount: sale.total,
      cashEffect: cash ? sign * sale.total : 0,
      by: sale.createdByName,
      note: sale.note,
    });
  }
  for (const move of moves) {
    const sign = move.kind === CashMoveKind.IN ? 1 : -1;
    events.push({
      at: move.createdAt,
      type: move.kind === CashMoveKind.IN ? 'cash_in' : 'cash_out',
      code: null,
      saleId: null,
      expenseId: null,
      paymentMethod: PaymentMethod.CASH,
      amount: move.amount,
      cashEffect: sign * move.amount,
      by: move.createdByName,
      note: move.note,
    });
  }
  for (const expense of expenses) {
    events.push({
      at: expense.createdAt,
      type: 'expense',
      code: formatDocumentNumber('EX', expense.number),
      saleId: null,
      expenseId: expense.id,
      paymentMethod: PaymentMethod.CASH,
      amount: expense.amount,
      cashEffect: -expense.amount,
      by: expense.createdByName,
      note: expense.type ? `${expense.type.name}: ${expense.purpose}` : expense.purpose,
    });
  }
  events.sort((a, b) => (a.type === 'open' ? -1 : b.type === 'open' ? 1 : a.at.getTime() - b.at.getTime()));
  if (session.closedAt) {
    events.push({
      at: session.closedAt,
      type: 'close',
      code: null,
      saleId: null,
      expenseId: null,
      paymentMethod: null,
      amount: session.countedCash ?? 0,
      cashEffect: 0,
      by: session.closedByName ?? session.cashierName,
      note: session.closeNote,
    });
  }
  let balance = 0;
  return events.map((event) => {
    const before = balance;
    balance = round2(balance + event.cashEffect);
    return { ...event, balanceBefore: before, balanceAfter: balance };
  });
}

