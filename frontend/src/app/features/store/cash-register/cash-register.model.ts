export type PaymentMethod = 'cash' | 'card';
export type CoverageStatus = 'uncovered' | 'partly_covered' | 'covered';
export type ActivityType = 'open' | 'sale' | 'return' | 'cash_in' | 'cash_out' | 'close';

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
};

export const COVERAGE_LABELS: Record<CoverageStatus, string> = {
  uncovered: 'Not covered',
  partly_covered: 'Partly covered',
  covered: 'Covered',
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  open: 'Opening',
  sale: 'Sale',
  return: 'Return',
  cash_in: 'Cash added',
  cash_out: 'Cash taken out',
  close: 'Closing',
};

export interface SessionMetrics {
  salesCount: number;
  returnsCount: number;
  cashSales: number;
  cardSales: number;
  cashReturns: number;
  cardReturns: number;
  cashIn: number;
  cashOut: number;
  netSales: number;
  expectedCash: number;
  covered: number;
}

export interface RegisterSession {
  id: string;
  storeId: string;
  storeName: string;
  registerNo: number;
  cashierName: string;
  openedAt: string;
  closedAt: string | null;
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

export interface ActivityRow {
  at: string;
  type: ActivityType;
  code: string | null;
  saleId: string | null;
  paymentMethod: PaymentMethod | null;
  amount: number;
  cashEffect: number;
  balanceBefore: number;
  balanceAfter: number;
  by: string;
  note: string | null;
}

export interface Coverage {
  id: string;
  code: string;
  amount: number;
  note: string | null;
  coveredByName: string;
  createdAt: string;
}

export interface RegisterSessionDetail extends RegisterSession {
  activity: ActivityRow[];
  coverages: Coverage[];
}

export interface RegisterAvailability {
  no: number;
  inUseBy: string | null;
}

export interface Period {
  from: string;
  to: string;
  storeId?: string;
}

export function periodParams(period: Period): Record<string, string> {
  return {
    from: period.from,
    to: period.to,
    ...(period.storeId ? { storeId: period.storeId } : {}),
  };
}

export function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDate(date);
}

export function localDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function errorText(error: unknown, fallback: string): string {
  const message = (error as { error?: { message?: unknown } })?.error?.message;
  return typeof message === 'string' ? message : Array.isArray(message) ? String(message[0]) : fallback;
}
