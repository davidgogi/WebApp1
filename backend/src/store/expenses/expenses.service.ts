import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { AuditService } from '../../audit/audit.service.js';
import { AuthUser } from '../../auth/auth-user.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { formatDocumentNumber, nextDocumentNumber } from '../../common/document-number.js';
import { isValidIban, normalizeIban } from '../../common/iban.js';
import { nameKey, nameKeySql } from '../../common/name-key.js';
import { Counterparty } from '../../parameters/counterparties/counterparty.entity.js';
import { CounterpartyStatus } from '../../parameters/counterparties/counterparty-status.enum.js';
import { CashRegisterService } from '../cash-register/cash-register.service.js';
import { RegisterSession } from '../cash-register/register-session.entity.js';
import { round2, todayInStore } from '../store-scope.js';
import { Store } from '../stores/store.entity.js';
import { BankAccount } from './bank-account.entity.js';
import { ExpenseCategory } from './expense-category.entity.js';
import { ExpenseItemStatus } from './expense-item-status.enum.js';
import { ExpenseSource } from './expense-source.enum.js';
import { ExpenseStatus } from './expense-status.enum.js';
import { ExpenseType } from './expense-type.entity.js';
import { Expense } from './expense.entity.js';
import {
  BankAccountDto,
  CreateExpensesDto,
  ExpenseCategoryDto,
  ExpenseLineDto,
  ExpenseTypeDto,
  UpdateBankAccountDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseTypeDto,
} from './dto/expense.dto.js';

export interface ExpenseTypeView {
  id: string;
  categoryId: string;
  name: string;
  status: ExpenseItemStatus;
  expenseCount: number;
}

export interface ExpenseCategoryView {
  id: string;
  name: string;
  status: ExpenseItemStatus;
  expenseCount: number;
  types: ExpenseTypeView[];
}

export interface BankAccountView {
  id: string;
  name: string;
  accountNumber: string | null;
  openingBalance: number;
  balance: number;
  status: ExpenseItemStatus;
  expenseCount: number;
}

export interface ShortageView {
  sessionId: string;
  storeName: string;
  registerNo: number;
  cashierName: string;
  openedAt: Date;
  closedAt: Date;
  shortage: number;
  covered: number;
  left: number;
}

export interface ExpenseWorkspace {
  today: string;
  categories: ExpenseCategoryView[];
  bankAccounts: BankAccountView[];
  stores: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  session: { id: string; storeId: string; storeName: string; registerNo: number; expectedCash: number } | null;
  canManage: boolean;
  canPostCash: boolean;
  canPostBank: boolean;
  canCover: boolean;
  shortages: ShortageView[];
}

export interface ExpenseView {
  id: string;
  code: string;
  source: ExpenseSource;
  storeId: string;
  storeName: string;
  sessionId: string | null;
  registerNo: number | null;
  bankAccountName: string | null;
  categoryName: string;
  typeName: string;
  supplierName: string | null;
  expenseDate: string;
  amount: number;
  purpose: string;
  status: ExpenseStatus;
  createdByName: string;
  createdAt: Date;
  voidedAt: Date | null;
  voidedByName: string | null;
  voidReason: string | null;
  canVoid: boolean;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
    @InjectRepository(ExpenseCategory)
    private readonly categoriesRepository: Repository<ExpenseCategory>,
    @InjectRepository(ExpenseType)
    private readonly typesRepository: Repository<ExpenseType>,
    @InjectRepository(BankAccount)
    private readonly bankAccountsRepository: Repository<BankAccount>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    @InjectRepository(Counterparty)
    private readonly counterpartiesRepository: Repository<Counterparty>,
    private readonly cashRegister: CashRegisterService,
    private readonly audit: AuditService,
  ) {}

  async workspace(actor: AuthUser): Promise<ExpenseWorkspace> {
    const companyId = actor.companyId!;
    const [categories, bankAccounts, stores, suppliers, openSession] = await Promise.all([
      this.categoryViews(actor),
      this.bankAccountViews(actor),
      this.storesForBank(actor),
      this.counterpartiesRepository.find({
        select: { id: true, name: true },
        where: { companyId, isSupplier: true, status: CounterpartyStatus.ACTIVE },
        order: { name: 'ASC' },
      }),
      actor.employeeId
        ? this.expensesRepository.manager.findOne(RegisterSession, {
            where: { companyId, cashierId: actor.employeeId, closedAt: IsNull() },
            relations: { store: true },
          })
        : null,
    ]);
    const session = openSession
      ? {
          id: openSession.id,
          storeId: openSession.storeId,
          storeName: openSession.store.name,
          registerNo: openSession.registerNo,
          expectedCash: await this.cashRegister.expectedCashOf(this.expensesRepository.manager, actor, openSession),
        }
      : null;
    const canCover = actor.role === UserRole.MODULE_ADMIN || actor.role === UserRole.MANAGER;
    return {
      today: todayInStore(),
      canCover,
      shortages: canCover ? await this.shortages(actor) : [],
      categories,
      bankAccounts,
      stores: stores.map((store) => ({ id: store.id, name: store.name })),
      suppliers: suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name })),
      session,
      canManage: actor.role === UserRole.MODULE_ADMIN,
      canPostCash: !!session,
      canPostBank: actor.role === UserRole.MODULE_ADMIN || actor.role === UserRole.MANAGER,
    };
  }

  private async shortages(actor: AuthUser): Promise<ShortageView[]> {
    const sessions = await this.cashRegister
      .visibleSessions(actor)
      .andWhere('session.closed_at IS NOT NULL')
      .andWhere('session.variance < 0')
      .andWhere('session.coverage_status IN (:...statuses)', { statuses: ['uncovered', 'partly_covered'] })
      .orderBy('session.closed_at', 'DESC')
      .take(200)
      .getMany();
    const views = await this.cashRegister.toViews(actor, sessions);
    return views
      .filter((view) => view.canCover)
      .map((view) => ({
        sessionId: view.id,
        storeName: view.storeName,
        registerNo: view.registerNo,
        cashierName: view.cashierName,
        openedAt: view.openedAt,
        closedAt: view.closedAt!,
        shortage: round2(-(view.variance ?? 0)),
        covered: view.metrics.covered,
        left: view.shortageLeft,
      }));
  }

  async create(actor: AuthUser, dto: CreateExpensesDto): Promise<ExpenseView[]> {
    const today = todayInStore();
    const ids = await this.expensesRepository.manager.transaction(async (manager) => {
      const cashLines = dto.lines.filter((line) => line.source === ExpenseSource.CASH);
      const register = cashLines.length > 0 ? await this.cashRegister.lockOwnOpenSession(manager, actor) : null;
      if (register) {
        const expected = await this.cashRegister.expectedCashOf(manager, actor, register.session);
        const total = round2(cashLines.reduce((sum, line) => sum + line.amount, 0));
        if (total > expected) {
          throw new BadRequestException(`Only ₾${expected.toFixed(2)} should be in the register`);
        }
      }
      if (dto.lines.some((line) => line.source === ExpenseSource.BANK) && !this.canPostBank(actor)) {
        throw new ForbiddenException('Only the Store admin and store managers can pay expenses from a bank account');
      }
      const created: string[] = [];
      for (const line of dto.lines) {
        const type = await this.usableType(manager, actor, line.typeId);
        const supplier = await this.usableSupplier(manager, actor, line.supplierId);
        if (line.source === ExpenseSource.SHORTAGE) {
          const { session, store } = await this.cashRegister.lockSession(manager, actor, line.sessionId!);
          const covered = await this.cashRegister.coverLocked(manager, actor, session, store, line.amount, {
            note: line.purpose,
            purpose: line.purpose,
            categoryId: type.categoryId,
            typeId: type.id,
            supplierId: supplier?.id ?? null,
            supplierName: supplier?.name ?? null,
          });
          created.push(covered.expenseId);
          await this.audit.record(
            actor,
            'register.cover',
            `Covered ₾${line.amount.toFixed(2)} of a shortage as ${type.name}: ${covered.summary}`,
          );
          continue;
        }
        let values: Partial<Expense>;
        if (line.source === ExpenseSource.CASH) {
          values = {
            storeId: register!.store.id,
            sessionId: register!.session.id,
            bankAccountId: null,
            expenseDate: today,
          };
        } else {
          const account = await this.usableBankAccount(manager, actor, line.bankAccountId!);
          const store = await this.storeForBank(manager, actor, line.storeId!);
          const expenseDate = line.expenseDate || today;
          if (expenseDate > today) {
            throw new BadRequestException("The expense date can't be in the future");
          }
          values = { storeId: store.id, sessionId: null, bankAccountId: account.id, expenseDate };
        }
        const number = await nextDocumentNumber(manager, Expense, actor.companyId!, 'expense');
        const saved = await manager.save(
          manager.create(Expense, {
            ...values,
            companyId: actor.companyId!,
            number,
            source: line.source,
            categoryId: type.categoryId,
            typeId: type.id,
            supplierId: supplier?.id ?? null,
            supplierName: supplier?.name ?? null,
            amount: line.amount,
            purpose: line.purpose,
            createdByName: actor.displayName,
          }),
        );
        created.push(saved.id);
        await this.audit.record(
          actor,
          'expense.create',
          `Recorded expense ${formatDocumentNumber('EX', number)}: ₾${line.amount.toFixed(2)} ${type.name} (${describeSource(line, register?.session)})`,
        );
      }
      return created;
    });
    const views = await this.toViews(actor, await this.visibleExpenses(actor).andWhere('expense.id IN (:...ids)', { ids }).getMany());
    return views.sort((a, b) => a.code.localeCompare(b.code));
  }

  async voidExpense(actor: AuthUser, id: string, reason: string | null | undefined): Promise<ExpenseView> {
    const expense = await this.visibleExpenses(actor).andWhere('expense.id = :id', { id }).getOne();
    if (!expense) {
      throw new NotFoundException(`Expense ${id} not found`);
    }
    const code = formatDocumentNumber('EX', expense.number);
    if (!this.mayVoid(actor, expense)) {
      throw new ForbiddenException('Only the Store admin or the store manager can delete an expense');
    }
    await this.expensesRepository.manager.transaction(async (manager) => {
      const session = expense.sessionId
        ? await manager.findOneOrFail(RegisterSession, {
            where: { id: expense.sessionId, companyId: actor.companyId! },
            lock: { mode: 'pessimistic_write' },
          })
        : null;
      if (session?.closedAt && expense.source === ExpenseSource.CASH) {
        throw new BadRequestException(`${code} was paid from a register that is already closed, so it can't be deleted`);
      }
      const locked = await manager.findOneOrFail(Expense, {
        where: { id, companyId: actor.companyId! },
        lock: { mode: 'pessimistic_write' },
      });
      if (locked.status !== ExpenseStatus.ACTIVE) {
        throw new BadRequestException(`${code} is already deleted`);
      }
      if (session && expense.source === ExpenseSource.SHORTAGE) {
        await this.cashRegister.uncoverLocked(manager, actor, session, id);
      }
      await manager.update(
        Expense,
        { id, companyId: actor.companyId! },
        { status: ExpenseStatus.VOIDED, voidedAt: new Date(), voidedByName: actor.displayName, voidReason: reason || null },
      );
    });
    await this.audit.record(
      actor,
      'expense.void',
      `Deleted expense ${code} (₾${expense.amount.toFixed(2)})${reason ? `: ${reason}` : ''}`,
    );
    const [view] = await this.toViews(actor, [(await this.visibleExpenses(actor).andWhere('expense.id = :id', { id }).getOne())!]);
    return view;
  }

  visibleExpenses(actor: AuthUser): SelectQueryBuilder<Expense> {
    const query = this.expensesRepository
      .createQueryBuilder('expense')
      .innerJoinAndSelect('expense.store', 'store')
      .leftJoinAndSelect('expense.category', 'category')
      .leftJoinAndSelect('expense.type', 'type')
      .leftJoinAndSelect('expense.session', 'session')
      .leftJoinAndSelect('expense.bankAccount', 'bankAccount')
      .where('expense.company_id = :companyId', { companyId: actor.companyId });
    if (actor.role === UserRole.CASHIER) {
      query.andWhere('session.cashier_id = :employeeId', { employeeId: actor.employeeId });
    } else if (actor.role === UserRole.MANAGER) {
      query.andWhere('(store.manager_id = :employeeId OR session.cashier_id = :employeeId)', { employeeId: actor.employeeId });
    }
    return query;
  }

  async toViews(actor: AuthUser, expenses: Expense[]): Promise<ExpenseView[]> {
    return expenses.map((expense) => ({
      id: expense.id,
      code: formatDocumentNumber('EX', expense.number),
      source: expense.source,
      storeId: expense.storeId,
      storeName: expense.store!.name,
      sessionId: expense.sessionId,
      registerNo: expense.session?.registerNo ?? null,
      bankAccountName: expense.bankAccount?.name ?? null,
      categoryName: expense.category?.name ?? 'Cash register',
      typeName: expense.type?.name ?? 'Shortage coverage',
      supplierName: expense.supplierName,
      expenseDate: expense.expenseDate,
      amount: expense.amount,
      purpose: expense.purpose,
      status: expense.status,
      createdByName: expense.createdByName,
      createdAt: expense.createdAt,
      voidedAt: expense.voidedAt,
      voidedByName: expense.voidedByName,
      voidReason: expense.voidReason,
      canVoid:
        expense.status === ExpenseStatus.ACTIVE &&
        this.mayVoid(actor, expense) &&
        (expense.source !== ExpenseSource.CASH || !expense.session?.closedAt),
    }));
  }

  async createCategory(actor: AuthUser, dto: ExpenseCategoryDto): Promise<ExpenseCategoryView[]> {
    await this.assertCategoryNameFree(actor, dto.name);
    const saved = await this.categoriesRepository.save(
      this.categoriesRepository.create({ companyId: actor.companyId!, name: dto.name, status: dto.status ?? ExpenseItemStatus.ACTIVE }),
    );
    await this.audit.record(actor, 'expense_category.create', `Created expense category ${saved.name}`);
    return this.categoryViews(actor);
  }

  async updateCategory(actor: AuthUser, id: string, dto: UpdateExpenseCategoryDto): Promise<ExpenseCategoryView[]> {
    const category = await this.findCategory(actor, id);
    if (dto.name !== undefined && nameKey(dto.name) !== nameKey(category.name)) {
      await this.assertCategoryNameFree(actor, dto.name, id);
    }
    await this.categoriesRepository.update(
      { id, companyId: actor.companyId! },
      { ...(dto.name !== undefined ? { name: dto.name } : {}), ...(dto.status ? { status: dto.status } : {}) },
    );
    await this.audit.record(actor, 'expense_category.update', `Updated expense category ${dto.name ?? category.name}`);
    return this.categoryViews(actor);
  }

  async removeCategory(actor: AuthUser, id: string): Promise<ExpenseCategoryView[]> {
    const category = await this.findCategory(actor, id);
    if (await this.expensesRepository.existsBy({ companyId: actor.companyId!, categoryId: id })) {
      throw new ConflictException(`${category.name} has expenses, so it can't be deleted. Set it to Inactive instead.`);
    }
    await this.categoriesRepository.delete({ id, companyId: actor.companyId! });
    await this.audit.record(actor, 'expense_category.delete', `Deleted expense category ${category.name}`);
    return this.categoryViews(actor);
  }

  async createType(actor: AuthUser, categoryId: string, dto: ExpenseTypeDto): Promise<ExpenseCategoryView[]> {
    const category = await this.findCategory(actor, categoryId);
    await this.assertTypeNameFree(actor, category.id, dto.name);
    const saved = await this.typesRepository.save(
      this.typesRepository.create({
        companyId: actor.companyId!,
        categoryId: category.id,
        name: dto.name,
        status: dto.status ?? ExpenseItemStatus.ACTIVE,
      }),
    );
    await this.audit.record(actor, 'expense_type.create', `Created expense type ${saved.name} in ${category.name}`);
    return this.categoryViews(actor);
  }

  async updateType(actor: AuthUser, id: string, dto: UpdateExpenseTypeDto): Promise<ExpenseCategoryView[]> {
    const type = await this.findType(actor, id);
    const categoryId = dto.categoryId ?? type.categoryId;
    if (dto.categoryId && dto.categoryId !== type.categoryId) {
      await this.findCategory(actor, dto.categoryId);
      if (await this.expensesRepository.existsBy({ companyId: actor.companyId!, typeId: id })) {
        throw new ConflictException(`${type.name} has expenses, so it can't move to another category`);
      }
    }
    const name = dto.name ?? type.name;
    if (categoryId !== type.categoryId || nameKey(name) !== nameKey(type.name)) {
      await this.assertTypeNameFree(actor, categoryId, name, id);
    }
    await this.typesRepository.update(
      { id, companyId: actor.companyId! },
      { name, categoryId, ...(dto.status ? { status: dto.status } : {}) },
    );
    await this.audit.record(actor, 'expense_type.update', `Updated expense type ${name}`);
    return this.categoryViews(actor);
  }

  async removeType(actor: AuthUser, id: string): Promise<ExpenseCategoryView[]> {
    const type = await this.findType(actor, id);
    if (await this.expensesRepository.existsBy({ companyId: actor.companyId!, typeId: id })) {
      throw new ConflictException(`${type.name} has expenses, so it can't be deleted. Set it to Inactive instead.`);
    }
    await this.typesRepository.delete({ id, companyId: actor.companyId! });
    await this.audit.record(actor, 'expense_type.delete', `Deleted expense type ${type.name}`);
    return this.categoryViews(actor);
  }

  async createBankAccount(actor: AuthUser, dto: BankAccountDto): Promise<BankAccountView[]> {
    await this.assertBankNameFree(actor, dto.name);
    const saved = await this.bankAccountsRepository.save(
      this.bankAccountsRepository.create({
        companyId: actor.companyId!,
        name: dto.name,
        accountNumber: checkedIban(dto.accountNumber),
        openingBalance: dto.openingBalance ?? 0,
        status: dto.status ?? ExpenseItemStatus.ACTIVE,
      }),
    );
    await this.audit.record(actor, 'bank_account.create', `Created bank account ${saved.name}`);
    return this.bankAccountViews(actor);
  }

  async updateBankAccount(actor: AuthUser, id: string, dto: UpdateBankAccountDto): Promise<BankAccountView[]> {
    const account = await this.findBankAccount(actor, id);
    if (dto.name !== undefined && nameKey(dto.name) !== nameKey(account.name)) {
      await this.assertBankNameFree(actor, dto.name, id);
    }
    await this.bankAccountsRepository.update(
      { id, companyId: actor.companyId! },
      {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.accountNumber !== undefined ? { accountNumber: checkedIban(dto.accountNumber) } : {}),
        ...(dto.openingBalance !== undefined ? { openingBalance: dto.openingBalance } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    );
    await this.audit.record(actor, 'bank_account.update', `Updated bank account ${dto.name ?? account.name}`);
    return this.bankAccountViews(actor);
  }

  async removeBankAccount(actor: AuthUser, id: string): Promise<BankAccountView[]> {
    const account = await this.findBankAccount(actor, id);
    if (await this.expensesRepository.existsBy({ companyId: actor.companyId!, bankAccountId: id })) {
      throw new ConflictException(`${account.name} has expenses, so it can't be deleted. Set it to Inactive instead.`);
    }
    await this.bankAccountsRepository.delete({ id, companyId: actor.companyId! });
    await this.audit.record(actor, 'bank_account.delete', `Deleted bank account ${account.name}`);
    return this.bankAccountViews(actor);
  }

  private canPostBank(actor: AuthUser): boolean {
    return actor.role === UserRole.MODULE_ADMIN || actor.role === UserRole.MANAGER;
  }

  private mayVoid(actor: AuthUser, expense: Expense): boolean {
    return (
      actor.role === UserRole.MODULE_ADMIN ||
      (actor.role === UserRole.MANAGER && !!actor.employeeId && expense.store?.managerId === actor.employeeId)
    );
  }

  private storesForBank(actor: AuthUser): Promise<Store[]> {
    if (actor.role === UserRole.MODULE_ADMIN) {
      return this.storesRepository.find({ where: { companyId: actor.companyId! }, order: { name: 'ASC' } });
    }
    if (actor.role === UserRole.MANAGER && actor.employeeId) {
      return this.storesRepository.find({ where: { companyId: actor.companyId!, managerId: actor.employeeId }, order: { name: 'ASC' } });
    }
    return Promise.resolve([]);
  }

  private async storeForBank(manager: EntityManager, actor: AuthUser, storeId: string): Promise<Store> {
    const store = await manager.findOne(Store, { where: { id: storeId, companyId: actor.companyId! } });
    if (!store || (actor.role === UserRole.MANAGER && store.managerId !== actor.employeeId)) {
      throw new ForbiddenException('You can only record expenses for your own stores');
    }
    return store;
  }

  private async usableType(manager: EntityManager, actor: AuthUser, typeId: string): Promise<ExpenseType> {
    const type = await manager.findOne(ExpenseType, {
      where: { id: typeId, companyId: actor.companyId! },
      relations: { category: true },
    });
    if (!type) {
      throw new BadRequestException('Expense type not found');
    }
    if (type.status !== ExpenseItemStatus.ACTIVE || type.category!.status !== ExpenseItemStatus.ACTIVE) {
      throw new BadRequestException(`${type.name} is inactive and can't be used for a new expense`);
    }
    return type;
  }

  private async usableSupplier(manager: EntityManager, actor: AuthUser, supplierId: string | null | undefined): Promise<Counterparty | null> {
    if (!supplierId) {
      return null;
    }
    const supplier = await manager.findOne(Counterparty, { where: { id: supplierId, companyId: actor.companyId! } });
    if (!supplier || !supplier.isSupplier || supplier.status !== CounterpartyStatus.ACTIVE) {
      throw new BadRequestException('Choose an active supplier');
    }
    return supplier;
  }

  private async usableBankAccount(manager: EntityManager, actor: AuthUser, id: string): Promise<BankAccount> {
    const account = await manager.findOne(BankAccount, { where: { id, companyId: actor.companyId! } });
    if (!account) {
      throw new BadRequestException('Bank account not found');
    }
    if (account.status !== ExpenseItemStatus.ACTIVE) {
      throw new BadRequestException(`${account.name} is inactive and can't be used for a new expense`);
    }
    return account;
  }

  private async categoryViews(actor: AuthUser): Promise<ExpenseCategoryView[]> {
    const [categories, typeCounts] = await Promise.all([
      this.categoriesRepository.find({
        where: { companyId: actor.companyId! },
        relations: { types: true },
        order: { name: 'ASC' },
      }),
      this.expensesRepository
        .createQueryBuilder('expense')
        .select('expense.type_id', 'typeId')
        .addSelect('COUNT(*)', 'count')
        .where('expense.company_id = :companyId', { companyId: actor.companyId })
        .groupBy('expense.type_id')
        .getRawMany<{ typeId: string; count: string }>(),
    ]);
    const counts = new Map(typeCounts.map((row) => [row.typeId, Number(row.count)]));
    return categories.map((category) => {
      const types = (category.types ?? [])
        .map((type) => ({
          id: type.id,
          categoryId: category.id,
          name: type.name,
          status: type.status,
          expenseCount: counts.get(type.id) ?? 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return {
        id: category.id,
        name: category.name,
        status: category.status,
        expenseCount: types.reduce((sum, type) => sum + type.expenseCount, 0),
        types,
      };
    });
  }

  private async bankAccountViews(actor: AuthUser): Promise<BankAccountView[]> {
    const [accounts, totals] = await Promise.all([
      this.bankAccountsRepository.find({ where: { companyId: actor.companyId! }, order: { name: 'ASC' } }),
      this.expensesRepository
        .createQueryBuilder('expense')
        .select('expense.bank_account_id', 'accountId')
        .addSelect('COUNT(*)', 'count')
        .addSelect(`COALESCE(SUM(expense.amount) FILTER (WHERE expense.status = '${ExpenseStatus.ACTIVE}'), 0)`, 'spent')
        .where('expense.company_id = :companyId', { companyId: actor.companyId })
        .andWhere('expense.bank_account_id IS NOT NULL')
        .groupBy('expense.bank_account_id')
        .getRawMany<{ accountId: string; count: string; spent: string }>(),
    ]);
    const byAccount = new Map(totals.map((row) => [row.accountId, row]));
    return accounts.map((account) => {
      const row = byAccount.get(account.id);
      return {
        id: account.id,
        name: account.name,
        accountNumber: account.accountNumber,
        openingBalance: account.openingBalance,
        balance: round2(account.openingBalance - Number(row?.spent ?? 0)),
        status: account.status,
        expenseCount: Number(row?.count ?? 0),
      };
    });
  }

  private async findCategory(actor: AuthUser, id: string): Promise<ExpenseCategory> {
    const category = await this.categoriesRepository.findOne({ where: { id, companyId: actor.companyId! } });
    if (!category) {
      throw new NotFoundException(`Expense category ${id} not found`);
    }
    return category;
  }

  private async findType(actor: AuthUser, id: string): Promise<ExpenseType> {
    const type = await this.typesRepository.findOne({ where: { id, companyId: actor.companyId! } });
    if (!type) {
      throw new NotFoundException(`Expense type ${id} not found`);
    }
    return type;
  }

  private async findBankAccount(actor: AuthUser, id: string): Promise<BankAccount> {
    const account = await this.bankAccountsRepository.findOne({ where: { id, companyId: actor.companyId! } });
    if (!account) {
      throw new NotFoundException(`Bank account ${id} not found`);
    }
    return account;
  }

  private async assertCategoryNameFree(actor: AuthUser, name: string, exceptId?: string): Promise<void> {
    const query = this.categoriesRepository
      .createQueryBuilder('category')
      .where('category.company_id = :companyId', { companyId: actor.companyId })
      .andWhere(`${nameKeySql('category.name')} = :key`, { key: nameKey(name) });
    if (exceptId) {
      query.andWhere('category.id <> :exceptId', { exceptId });
    }
    if (await query.getExists()) {
      throw new ConflictException(`An expense category named "${name}" already exists`);
    }
  }

  private async assertTypeNameFree(actor: AuthUser, categoryId: string, name: string, exceptId?: string): Promise<void> {
    const query = this.typesRepository
      .createQueryBuilder('type')
      .where('type.company_id = :companyId', { companyId: actor.companyId })
      .andWhere('type.category_id = :categoryId', { categoryId })
      .andWhere(`${nameKeySql('type.name')} = :key`, { key: nameKey(name) });
    if (exceptId) {
      query.andWhere('type.id <> :exceptId', { exceptId });
    }
    if (await query.getExists()) {
      throw new ConflictException(`This category already has an expense type named "${name}"`);
    }
  }

  private async assertBankNameFree(actor: AuthUser, name: string, exceptId?: string): Promise<void> {
    const query = this.bankAccountsRepository
      .createQueryBuilder('account')
      .where('account.company_id = :companyId', { companyId: actor.companyId })
      .andWhere(`${nameKeySql('account.name')} = :key`, { key: nameKey(name) });
    if (exceptId) {
      query.andWhere('account.id <> :exceptId', { exceptId });
    }
    if (await query.getExists()) {
      throw new ConflictException(`A bank account named "${name}" already exists`);
    }
  }
}

function checkedIban(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const iban = normalizeIban(value);
  if (!isValidIban(iban)) {
    throw new BadRequestException('The bank account must be a valid IBAN, e.g. GE29NB0000000101904917');
  }
  return iban;
}

function describeSource(line: ExpenseLineDto, session: RegisterSession | undefined): string {
  return line.source === ExpenseSource.CASH ? `cash, register ${session?.registerNo ?? ''}` : 'bank';
}
