export interface PersonRef {
  id: string;
  name: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  registers: number;
  manager: PersonRef | null;
}

export interface StorePayload {
  name: string;
  address: string;
  registers: number;
  managerId: string | null;
}

// HR employees who can be picked as a store's manager (Store managers).
export interface StoreOptions {
  managers: PersonRef[];
}
