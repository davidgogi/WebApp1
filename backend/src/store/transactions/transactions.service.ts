import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuthUser } from '../../auth/auth-user.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { ProductUnit } from '../../wms/products/product-unit.enum.js';
import { saleCode } from '../cash-register/cash-register.service.js';
import { PeriodQuery } from '../cash-register/dto/register.dto.js';
import { SaleKind } from '../cash-register/sale-kind.enum.js';
import { SaleLine } from '../cash-register/sale-line.entity.js';
import { ExpenseSource } from '../expenses/expense-source.enum.js';
import { ExpenseView, ExpensesService } from '../expenses/expenses.service.js';
import { SalesService } from '../sales/sales.service.js';
import { localDaySql, period } from '../store-scope.js';

export type DocumentKind = 'sale' | 'return' | 'expense' | 'coverage';
export type MoneyMethod = 'cash' | 'card' | 'bank';

export interface TransactionRow {
  id: string;
  kind: DocumentKind;
  code: string;
  at: Date;
  storeId: string;
  storeName: string;
  registerNo: number | null;
  sessionId: string | null;
  method: MoneyMethod;
  amount: number;
  direction: 'in' | 'out';
  by: string;
  description: string | null;
  lineCount: number;
  original: { id: string; code: string } | null;
  status: 'active' | 'voided';
  expense: ExpenseView | null;
  canVoid: boolean;
}

export interface OperationRow {
  id: string;
  kind: DocumentKind;
  name: string;
  detail: string | null;
  quantity: number | null;
  unit: ProductUnit | null;
  unitPrice: number | null;
  amount: number;
  direction: 'in' | 'out';
  at: Date;
  storeId: string;
  storeName: string;
  registerNo: number | null;
  sessionId: string | null;
  documentId: string;
  documentCode: string;
  method: MoneyMethod;
  by: string;
  status: 'active' | 'voided';
  expense: ExpenseView | null;
}

const MAX_ROWS = 5000;

const methodOf = (expense: ExpenseView): MoneyMethod => (expense.source === ExpenseSource.BANK ? 'bank' : 'cash');
const kindOf = (expense: ExpenseView): DocumentKind => (expense.source === ExpenseSource.SHORTAGE ? 'coverage' : 'expense');
const statusOf = (expense: ExpenseView): 'active' | 'voided' => (expense.status === 'active' ? 'active' : 'voided');

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(SaleLine)
    private readonly linesRepository: Repository<SaleLine>,
    private readonly sales: SalesService,
    private readonly expenses: ExpensesService,
  ) {}

  async transactions(actor: AuthUser, query: PeriodQuery): Promise<TransactionRow[]> {
    const { from, to } = period(query.from, query.to);
    const [sales, expenses] = await Promise.all([
      this.sales.findAll(actor, { from, to, storeId: query.storeId }),
      this.expenseViews(actor, from, to, query.storeId),
    ]);
    const rows: TransactionRow[] = [
      ...sales.map((sale) => ({
        id: sale.id,
        kind: sale.kind === SaleKind.SALE ? ('sale' as const) : ('return' as const),
        code: sale.code,
        at: sale.createdAt,
        storeId: sale.storeId,
        storeName: sale.storeName,
        registerNo: sale.registerNo,
        sessionId: sale.sessionId,
        method: sale.paymentMethod,
        amount: sale.total,
        direction: sale.kind === SaleKind.SALE ? ('in' as const) : ('out' as const),
        by: sale.createdByName,
        description: null,
        lineCount: sale.lineCount,
        original: sale.original,
        status: 'active' as const,
        expense: null,
        canVoid: false,
      })),
      ...expenses.map((expense) => ({
        id: expense.id,
        kind: kindOf(expense),
        code: expense.code,
        at: expense.createdAt,
        storeId: expense.storeId,
        storeName: expense.storeName,
        registerNo: expense.registerNo,
        sessionId: expense.sessionId,
        method: methodOf(expense),
        amount: expense.amount,
        direction: 'out' as const,
        by: expense.createdByName,
        description: `${expense.typeName}: ${expense.purpose}`,
        lineCount: 1,
        original: null,
        status: statusOf(expense),
        expense,
        canVoid: expense.canVoid,
      })),
    ];
    return rows.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, MAX_ROWS);
  }

  async operations(actor: AuthUser, query: PeriodQuery): Promise<OperationRow[]> {
    const { from, to } = period(query.from, query.to);
    const [lines, expenses] = await Promise.all([
      this.saleLines(actor, from, to, query.storeId),
      this.expenseViews(actor, from, to, query.storeId),
    ]);
    const rows: OperationRow[] = [
      ...lines.map((line) => {
        const sale = line.sale!;
        const isSale = sale.kind === SaleKind.SALE;
        return {
          id: line.id,
          kind: isSale ? ('sale' as const) : ('return' as const),
          name: line.productName,
          detail: line.barcode,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          amount: line.lineTotal,
          direction: isSale ? ('in' as const) : ('out' as const),
          at: sale.createdAt,
          storeId: sale.session!.storeId,
          storeName: sale.session!.store.name,
          registerNo: sale.session!.registerNo,
          sessionId: sale.sessionId,
          documentId: sale.id,
          documentCode: saleCode(sale),
          method: sale.paymentMethod,
          by: sale.createdByName,
          status: 'active' as const,
          expense: null,
        };
      }),
      ...expenses.map((expense) => ({
        id: expense.id,
        kind: kindOf(expense),
        name: expense.typeName,
        detail: expense.categoryName,
        quantity: null,
        unit: null,
        unitPrice: null,
        amount: expense.amount,
        direction: 'out' as const,
        at: expense.createdAt,
        storeId: expense.storeId,
        storeName: expense.storeName,
        registerNo: expense.registerNo,
        sessionId: expense.sessionId,
        documentId: expense.id,
        documentCode: expense.code,
        method: methodOf(expense),
        by: expense.createdByName,
        status: statusOf(expense),
        expense,
      })),
    ];
    return rows.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, MAX_ROWS);
  }

  private async expenseViews(actor: AuthUser, from: string, to: string, storeId?: string): Promise<ExpenseView[]> {
    const query = this.expenses
      .visibleExpenses(actor)
      .andWhere(`${localDaySql('expense.created_at')} BETWEEN :from AND :to`, { from, to })
      .orderBy('expense.created_at', 'DESC')
      .take(MAX_ROWS);
    if (storeId) {
      query.andWhere('expense.store_id = :storeId', { storeId });
    }
    return this.expenses.toViews(actor, await query.getMany());
  }

  private saleLines(actor: AuthUser, from: string, to: string, storeId?: string): Promise<SaleLine[]> {
    const query = this.scoped(
      actor,
      this.linesRepository
        .createQueryBuilder('line')
        .innerJoinAndSelect('line.sale', 'sale')
        .innerJoinAndSelect('sale.session', 'session')
        .innerJoinAndSelect('session.store', 'store')
        .where('line.company_id = :companyId', { companyId: actor.companyId })
        .andWhere(`${localDaySql('sale.created_at')} BETWEEN :from AND :to`, { from, to })
        .orderBy('sale.created_at', 'DESC')
        .addOrderBy('line.position', 'ASC')
        .take(MAX_ROWS),
    );
    if (storeId) {
      query.andWhere('session.store_id = :storeId', { storeId });
    }
    return query.getMany();
  }

  private scoped<T extends object>(actor: AuthUser, query: SelectQueryBuilder<T>): SelectQueryBuilder<T> {
    if (actor.role === UserRole.CASHIER) {
      query.andWhere('session.cashier_id = :employeeId', { employeeId: actor.employeeId });
    } else if (actor.role === UserRole.MANAGER) {
      query.andWhere('(store.manager_id = :employeeId OR session.cashier_id = :employeeId)', { employeeId: actor.employeeId });
    }
    return query;
  }
}
