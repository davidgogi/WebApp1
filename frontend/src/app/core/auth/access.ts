import { AccessModule, Role, SessionUser } from './auth.model';

export const ADMIN_ROLES: Role[] = ['system_admin', 'module_admin'];

// Who may use a module. The backend enforces the same rules; this only decides what to show.
//  - system admin: HR and every module the company bought
//  - module admin: their own module, plus HR (limited to their module's people)
//  - manager: their own module; a Store or WMS manager also gets HR, limited to the people of his
//    stores / warehouses
//  - cashier: only their own module, never HR
export function canAccessModule(user: SessionUser | null, module: AccessModule): boolean {
  if (!user || user.role === 'superuser') {
    return false;
  }
  if (module !== 'hr' && !user.companyModules.includes(module)) {
    return false;
  }
  switch (user.role) {
    case 'system_admin':
      return true;
    case 'module_admin':
      return module === 'hr' || user.module === module;
    case 'manager':
      return module === 'hr' ? user.module === 'store' || user.module === 'wms' : user.module === module;
    default:
      return module !== 'hr' && user.module === module;
  }
}

// The first page each kind of user should land on.
export function landingUrl(user: SessionUser): string {
  switch (user.role) {
    case 'superuser':
      return '/superadmin/companies';
    case 'system_admin':
      return '/hr/employees';
    case 'cashier':
      return '/store/pos';
    default:
      break;
  }
  switch (user.module) {
    case 'wms':
      return '/wms/warehouses';
    case 'store':
      return user.role === 'manager' ? '/store/stores' : '/store/cash-register';
    case 'restaurant':
      return '/restaurant/table-service';
    default:
      return '/login';
  }
}
