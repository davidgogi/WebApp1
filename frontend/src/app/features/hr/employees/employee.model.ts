export type EmployeeRole = 'manager' | 'staff';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  role: EmployeeRole;
}
