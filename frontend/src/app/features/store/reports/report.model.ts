import { RegisterSession } from '../cash-register/cash-register.model';

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
  shifts: RegisterSession[];
}
