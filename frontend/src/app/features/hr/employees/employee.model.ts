import { AppModule } from '../../../core/auth/auth.model';

// Roles are only about permissions and views (admin = module admin). A person with NO role has no
// access to the app: they are just a record in HR, described by their free-text position.
export type EmployeeRole = 'admin' | 'manager' | 'cashier';

export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: 'Module admin',
  manager: 'Manager',
  cashier: 'Cashier',
};

// Calculated by the backend from endDate: 'former' once the end date has passed.
export type EmployeeStatus = 'active' | 'former';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  // Required for new employees; null only for employees created before these fields existed.
  personalId: string | null;
  email: string | null;
  phone: string | null;
  branch: string | null;
  birthDate: string | null; // 'YYYY-MM-DD'
  hireDate: string | null; // 'YYYY-MM-DD'
  position: string | null;
  endDate: string | null; // 'YYYY-MM-DD', last working day; null while employed
  role: EmployeeRole | null;
  module: AppModule | null;
  // The login issued for this employee, if any.
  username: string | null;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  personalId: string;
  email: string;
  phone: string;
  branch: string;
  birthDate: string;
  hireDate: string;
  position: string;
  endDate: string | null;
  role: EmployeeRole | null;
  module: AppModule | null;
  // Only for a manager: the stores (Store) or warehouses (WMS) of his that the person works in.
  workplaceIds?: string[];
}
