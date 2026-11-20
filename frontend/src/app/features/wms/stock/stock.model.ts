import { Product, ProductUnit } from '../products/product.model';
import { Warehouse } from '../warehouses/warehouse.model';

export type StockMovementKind =
  | 'opening'
  | 'receipt'
  | 'receipt_cancel'
  | 'transfer_out'
  | 'transfer_in'
  | 'transfer_cancel'
  | 'sale'
  | 'sale_return';

export const STOCK_MOVEMENT_LABELS: Record<StockMovementKind, string> = {
  opening: 'Opening balance',
  receipt: 'Receipt',
  receipt_cancel: 'Receipt cancelled',
  transfer_out: 'Transfer sent',
  transfer_in: 'Transfer received',
  transfer_cancel: 'Transfer cancelled',
  sale: 'Store sale',
  sale_return: 'Store return',
};

export function movementDocumentLink(movement: StockMovement, canSeeStore = false): string[] | null {
  if (!movement.documentId) {
    return null;
  }
  if (movement.kind === 'sale' || movement.kind === 'sale_return') {
    return canSeeStore ? ['/store/sales', movement.documentId] : null;
  }
  return movement.kind.startsWith('receipt')
    ? ['/wms/receipts', movement.documentId]
    : ['/wms/transfers', movement.documentId];
}

export interface StockMovement {
  id: string;
  kind: StockMovementKind;
  quantity: number;
  balanceAfter: number;
  documentId: string | null;
  note: string | null;
  createdByName: string;
  createdAt: string;
  product: { id: string; name: string; barcode: string; unit: ProductUnit };
  warehouse: Pick<Warehouse, 'id' | 'code' | 'name'>;
}

export interface WarehouseStockRow {
  productId: string;
  quantity: number;
  product: Pick<Product, 'id' | 'name' | 'barcode' | 'category' | 'group' | 'unit' | 'costPrice' | 'status'>;
}
