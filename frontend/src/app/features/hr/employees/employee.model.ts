export type EmployeeRole = 'admin' | 'staff';

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
  role: EmployeeRole;
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
  role: EmployeeRole;
}
