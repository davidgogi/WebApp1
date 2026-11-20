import { Unit } from '../sales/sale.model';

export interface PosProduct {
  id: string;
  name: string;
  barcode: string;
  categoryId: string;
  unit: Unit;
  price: number;
  stock: number;
}

export interface PosCatalog {
  sessionId: string;
  registerNo: number;
  store: { id: string; name: string };
  warehouse: { id: string; code: string; name: string };
  categories: { id: string; name: string }[];
  products: PosProduct[];
}

export interface CartLine {
  product: PosProduct;
  quantity: number;
}
