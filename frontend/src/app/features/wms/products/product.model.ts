import { Warehouse } from '../warehouses/warehouse.model';

export type ProductUnit = 'kg' | 'pcs';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  amount: number;
  unit: ProductUnit;
  warehouses: Warehouse[];
  createdAt: string;
  updatedAt: string;
}

// Warehouses are sent as ids; the backend returns them as full objects.
export interface ProductPayload {
  name: string;
  sku: string;
  category: string;
  supplier: string;
  amount: number;
  unit: ProductUnit;
  warehouseIds: string[];
}
