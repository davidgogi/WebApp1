import { Expense } from '../record-expense/expense.model';

export type DocumentKind = 'sale' | 'return' | 'expense' | 'coverage';
export type MoneyMethod = 'cash' | 'card' | 'bank';
export type RowStatus = 'active' | 'voided';

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  sale: 'Sale',
  return: 'Return',
  expense: 'Expense',
  coverage: 'Shortage coverage',
};

export const MONEY_METHOD_LABELS: Record<MoneyMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  bank: 'Bank',
};

export interface TransactionRow {
  id: string;
  kind: DocumentKind;
  code: string;
  at: string;
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
  status: RowStatus;
  expense: Expense | null;
  canVoid: boolean;
}

export interface OperationRow {
  id: string;
  kind: DocumentKind;
  name: string;
  detail: string | null;
  quantity: number | null;
  unit: 'pcs' | 'kg' | null;
  unitPrice: number | null;
  amount: number;
  direction: 'in' | 'out';
  at: string;
  storeId: string;
  storeName: string;
  registerNo: number | null;
  sessionId: string | null;
  documentId: string;
  documentCode: string;
  method: MoneyMethod;
  by: string;
  status: RowStatus;
  expense: Expense | null;
}
