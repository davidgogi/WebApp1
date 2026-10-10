// Roles are only about permissions and views. A person with NO role has no access to the app
// (they are just a record in HR: a worker, a developer, whatever their position says).
// ADMIN = module admin (runs one module). The company's system admin is not an employee.
export enum EmployeeRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
}
