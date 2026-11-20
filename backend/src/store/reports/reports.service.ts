import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuthUser } from '../../auth/auth-user.js';
import { UserRole } from '../../auth/user-role.enum.js';
import { Language } from '../../common/i18n/translate.js';
import { addTableSheet, workbookBuffer } from '../../common/xlsx.js';
import { CashMoveKind } from '../cash-register/cash-move-kind.enum.js';
import { ActivityType, CashRegisterService, SessionDetail, SessionView } from '../cash-register/cash-register.service.js';
import { PaymentMethod } from '../cash-register/payment-method.enum.js';
import { RegisterCashMove } from '../cash-register/register-cash-move.entity.js';
import { SaleKind } from '../cash-register/sale-kind.enum.js';
import { Sale } from '../cash-register/sale.entity.js';
import { PeriodQuery } from '../cash-register/dto/register.dto.js';
import { localDaySql, period, round2 } from '../store-scope.js';

export interface DayRow {
  date: string;
  storeId: string;
  storeName: string;
  salesCount: number;
  cashSales: number;
  cardSales: number;
  returnsCount: number;
  cashReturns: number;
  cardReturns: number;
  netSales: number;
  cashIn: number;
  cashOut: number;
}

export interface DailyReport {
  from: string;
  to: string;
  days: DayRow[];
  shifts: SessionView[];
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  open: 'Opening',
  sale: 'Sale',
  return: 'Return',
  cash_in: 'Cash added',
  cash_out: 'Cash taken out',
  close: 'Closing',
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
};

const MONEY = '#,##0.00';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    @InjectRepository(RegisterCashMove)
    private readonly cashMovesRepository: Repository<RegisterCashMove>,
    private readonly cashRegister: CashRegisterService,
  ) {}

  async daily(actor: AuthUser, query: PeriodQuery): Promise<DailyReport> {
    const { from, to } = period(query.from, query.to, 7);
    const days = new Map<string, DayRow>();
    const rowOf = (date: string, storeId: string, storeName: string) => {
      const key = `${date}|${storeId}`;
      if (!days.has(key)) {
        days.set(key, {
          date,
          storeId,
          storeName,
          salesCount: 0,
          cashSales: 0,
          cardSales: 0,
          returnsCount: 0,
          cashReturns: 0,
          cardReturns: 0,
          netSales: 0,
          cashIn: 0,
          cashOut: 0,
        });
      }
      return days.get(key)!;
    };

    const sales = await this.scoped(
      actor,
      this.salesRepository
        .createQueryBuilder('sale')
        .innerJoin('sale.session', 'session')
        .innerJoin('session.store', 'store')
        .select(`to_char(${localDaySql('sale.created_at')}, 'YYYY-MM-DD')`, 'date')
        .addSelect('store.id', 'storeId')
        .addSelect('store.name', 'storeName')
        .addSelect('sale.kind', 'kind')
        .addSelect('sale.payment_method', 'method')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(sale.total)', 'total')
        .where('sale.company_id = :companyId', { companyId: actor.companyId })
        .andWhere(`${localDaySql('sale.created_at')} BETWEEN :from AND :to`, { from, to })
        .groupBy('1, 2, 3, 4, 5'),
      query.storeId,
    ).getRawMany<{ date: string; storeId: string; storeName: string; kind: SaleKind; method: PaymentMethod; count: string; total: string }>();
    for (const row of sales) {
      const day = rowOf(row.date, row.storeId, row.storeName);
      const total = Number(row.total);
      const cash = row.method === PaymentMethod.CASH;
      if (row.kind === SaleKind.SALE) {
        day.salesCount += Number(row.count);
        if (cash) day.cashSales = total;
        else day.cardSales = total;
      } else {
        day.returnsCount += Number(row.count);
        if (cash) day.cashReturns = total;
        else day.cardReturns = total;
      }
    }

    const moves = await this.scoped(
      actor,
      this.cashMovesRepository
        .createQueryBuilder('move')
        .innerJoin('move.session', 'session')
        .innerJoin('session.store', 'store')
        .select(`to_char(${localDaySql('move.created_at')}, 'YYYY-MM-DD')`, 'date')
        .addSelect('store.id', 'storeId')
        .addSelect('store.name', 'storeName')
        .addSelect('move.kind', 'kind')
        .addSelect('SUM(move.amount)', 'total')
        .where('move.company_id = :companyId', { companyId: actor.companyId })
        .andWhere(`${localDaySql('move.created_at')} BETWEEN :from AND :to`, { from, to })
        .groupBy('1, 2, 3, 4'),
      query.storeId,
    ).getRawMany<{ date: string; storeId: string; storeName: string; kind: CashMoveKind; total: string }>();
    for (const row of moves) {
      const day = rowOf(row.date, row.storeId, row.storeName);
      if (row.kind === CashMoveKind.IN) day.cashIn = Number(row.total);
      else day.cashOut = Number(row.total);
    }

    const rows = [...days.values()];
    for (const row of rows) {
      row.netSales = round2(row.cashSales + row.cardSales - row.cashReturns - row.cardReturns);
    }
    rows.sort((a, b) => b.date.localeCompare(a.date) || a.storeName.localeCompare(b.storeName));
    const shifts = await this.cashRegister.findAll(actor, { from, to, storeId: query.storeId });
    return { from, to, days: rows, shifts };
  }

  async dailyExport(actor: AuthUser, query: PeriodQuery, language: Language): Promise<Buffer> {
    const report = await this.daily(actor, query);
    const workbook = new ExcelJS.Workbook();
    addTableSheet(
      workbook,
      'Days',
      [
        { header: 'Date', width: 12 },
        { header: 'Store', width: 24 },
        { header: 'Sales', width: 8 },
        { header: 'Cash sales', width: 13, numFmt: MONEY },
        { header: 'Card sales', width: 13, numFmt: MONEY },
        { header: 'Returns', width: 9 },
        { header: 'Cash returns', width: 13, numFmt: MONEY },
        { header: 'Card returns', width: 13, numFmt: MONEY },
        { header: 'Net sales', width: 13, numFmt: MONEY },
        { header: 'Cash added', width: 13, numFmt: MONEY },
        { header: 'Cash taken out', width: 13, numFmt: MONEY },
      ],
      report.days.map((day) => [
        day.date,
        day.storeName,
        day.salesCount,
        day.cashSales,
        day.cardSales,
        day.returnsCount,
        day.cashReturns,
        day.cardReturns,
        day.netSales,
        day.cashIn,
        day.cashOut,
      ]),
    );
    addTableSheet(
      workbook,
      'Shifts',
      [
        { header: 'Store', width: 24 },
        { header: 'Register', width: 9 },
        { header: 'Cashier', width: 22 },
        { header: 'Opened', width: 17 },
        { header: 'Closed', width: 17 },
        { header: 'Sales', width: 8 },
        { header: 'Cash sales', width: 13, numFmt: MONEY },
        { header: 'Card sales', width: 13, numFmt: MONEY },
        { header: 'Returns', width: 9 },
        { header: 'Net sales', width: 13, numFmt: MONEY },
        { header: 'Opening cash', width: 13, numFmt: MONEY },
        { header: 'Expected cash', width: 13, numFmt: MONEY },
        { header: 'Counted cash', width: 13, numFmt: MONEY },
        { header: 'Difference', width: 12, numFmt: MONEY },
      ],
      report.shifts.map((shift) => [
        shift.storeName,
        shift.registerNo,
        shift.cashierName,
        localTime(shift.openedAt),
        shift.closedAt ? localTime(shift.closedAt) : '',
        shift.metrics.salesCount,
        shift.metrics.cashSales,
        shift.metrics.cardSales,
        shift.metrics.returnsCount,
        shift.metrics.netSales,
        shift.openingCash,
        shift.expectedCash,
        shift.countedCash ?? '',
        shift.variance ?? '',
      ]),
    );
    return workbookBuffer(workbook, language);
  }

  async cashMovementExport(actor: AuthUser, sessionId: string, language: Language): Promise<Buffer> {
    const shift: SessionDetail = await this.cashRegister.findOne(actor, sessionId);
    const workbook = new ExcelJS.Workbook();
    addTableSheet(
      workbook,
      'Cash movement',
      [
        { header: 'Time', width: 17 },
        { header: 'Operation', width: 16, translated: true },
        { header: 'Document', width: 12 },
        { header: 'Payment', width: 9, translated: true },
        { header: 'Amount', width: 12, numFmt: MONEY },
        { header: 'Cash before', width: 13, numFmt: MONEY },
        { header: 'Cash change', width: 13, numFmt: MONEY },
        { header: 'Cash after', width: 13, numFmt: MONEY },
        { header: 'By', width: 22 },
        { header: 'Note', width: 34 },
      ],
      [
        ...shift.activity.map((row) => [
          localTime(row.at),
          ACTIVITY_LABELS[row.type],
          row.code ?? '',
          row.paymentMethod ? PAYMENT_LABELS[row.paymentMethod] : '',
          row.amount,
          row.balanceBefore,
          row.cashEffect,
          row.balanceAfter,
          row.by,
          row.note ?? '',
        ]),
        [],
        ['', 'Expected cash', '', '', shift.expectedCash],
        ['', 'Counted cash', '', '', shift.countedCash ?? ''],
        ['', 'Difference', '', '', shift.variance ?? ''],
      ],
    );
    return workbookBuffer(workbook, language);
  }

  private scoped<T extends object>(actor: AuthUser, query: SelectQueryBuilder<T>, storeId?: string): SelectQueryBuilder<T> {
    if (actor.role === UserRole.MANAGER) {
      query.andWhere('store.manager_id = :employeeId', { employeeId: actor.employeeId });
    }
    if (storeId) {
      query.andWhere('store.id = :storeId', { storeId });
    }
    return query;
  }
}

function localTime(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tbilisi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(value)
    .replace(',', '')
    .replaceAll('/', '.');
}
