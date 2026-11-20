export interface PersonRef {
  id: string;
  name: string;
}

export interface WarehouseRef {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
}

export interface WarehouseOption extends WarehouseRef {
  branch: string | null;
  storeId: string | null;
  storeName: string | null;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  registers: number;
  manager: PersonRef | null;
  warehouse: WarehouseRef | null;
}

export interface StorePayload {
  name: string;
  address: string;
  registers: number;
  managerId: string | null;
  warehouseId: string;
}

export interface StoreOptions {
  managers: PersonRef[];
  warehouses: WarehouseOption[];
}
