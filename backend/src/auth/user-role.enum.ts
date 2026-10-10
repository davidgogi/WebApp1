export enum UserRole {
  SUPERUSER = 'superuser', // sells the app; belongs to no company
  SYSTEM_ADMIN = 'system_admin', // runs a whole company: HR + every module it bought
  MODULE_ADMIN = 'module_admin', // runs one module
  MANAGER = 'manager', // sees only what he manages (warehouses / stores)
  CASHIER = 'cashier', // sees only his own register sessions
}

export const ADMIN_ROLES = [UserRole.SYSTEM_ADMIN, UserRole.MODULE_ADMIN];
