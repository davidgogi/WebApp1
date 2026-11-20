import { PaymentMethod } from '../cash-register/cash-register.model';

export type SaleKind = 'sale' | 'return';
export type Unit = 'pcs' | 'kg';

export const SALE_KIND_LABELS: Record<SaleKind, string> = {
  sale: 'Sale',
  return: 'Return',
};

export interface SaleListItem {
  id: string;
  code: string;
  kind: SaleKind;
  createdAt: string;
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

export interface SaleLine {
  id: string;
  position: number;
  productId: string;
  productName: string;
  barcode: string;
  unit: Unit;
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
  lines: SaleLine[];
  returns: { id: string; code: string; createdAt: string; total: number; createdByName: string }[];
  canReturn: boolean;
}
