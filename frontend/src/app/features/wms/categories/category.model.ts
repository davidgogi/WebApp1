export type CategoryStatus = 'active' | 'inactive';

export interface ProductGroup {
  id: string;
  categoryId: string;
  name: string;
  status: CategoryStatus;
  productCount: number;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  status: CategoryStatus;
  productCount: number;
  groups: ProductGroup[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryPayload {
  name: string;
  description: string | null;
  status: CategoryStatus;
}
