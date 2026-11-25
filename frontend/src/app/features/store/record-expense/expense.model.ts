export type ExpenseSource = 'cash' | 'bank' | 'shortage';
export type ExpenseStatus = 'active' | 'voided';
export type ExpenseItemStatus = 'active' | 'inactive';

export const EXPENSE_ITEM_STATUS_LABELS: Record<ExpenseItemStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export interface ExpenseType {
  id: string;
  categoryId: string;
  name: string;
  status: ExpenseItemStatus;
  expenseCount: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  status: ExpenseItemStatus;
  expenseCount: number;
  types: ExpenseType[];
}

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string | null;
  openingBalance: number;
  balance: number;
  status: ExpenseItemStatus;
  expenseCount: number;
}

export interface ShortageToCover {
  sessionId: string;
  storeName: string;
  registerNo: number;
  cashierName: string;
  openedAt: string;
  closedAt: string;
  shortage: number;
  covered: number;
  left: number;
}

export interface ExpenseWorkspace {
  today: string;
  categories: ExpenseCategory[];
  bankAccounts: BankAccount[];
  stores: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  session: { id: string; storeId: string; storeName: string; registerNo: number; expectedCash: number } | null;
  canManage: boolean;
  canPostCash: boolean;
  canPostBank: boolean;
  canCover: boolean;
  shortages: ShortageToCover[];
}

export interface Expense {
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
  createdAt: string;
  voidedAt: string | null;
  voidedByName: string | null;
  voidReason: string | null;
  canVoid: boolean;
}

export interface ExpenseLinePayload {
  typeId: string;
  source: ExpenseSource;
  bankAccountId?: string;
  storeId?: string;
  sessionId?: string;
  supplierId?: string | null;
  expenseDate?: string | null;
  amount: number;
  purpose: string;
}

export interface CatalogItemPayload {
  name?: string;
  status?: ExpenseItemStatus;
  categoryId?: string;
}

export interface BankAccountPayload {
  name?: string;
  accountNumber?: string | null;
  openingBalance?: number;
  status?: ExpenseItemStatus;
}
