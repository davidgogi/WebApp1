import { AppModuleName } from '../companies/app-module.enum.js';
import { AuthUser } from './auth-user.js';
import { AccessModule } from './decorators.js';
import { UserRole } from './user-role.enum.js';

// Who may use a module:
//  - system admin: HR and every module the company bought
//  - module admin: their own module, plus HR (limited to their module's people)
//  - manager: their own module; a Store or WMS manager also gets HR, limited to the people of his
//    stores / warehouses
//  - cashier: only their own module, never HR
export function canAccessModule(user: AuthUser, module: AccessModule): boolean {
  if (user.role === UserRole.SUPERUSER) {
    return false;
  }
  if (module !== 'hr' && !user.companyModules.includes(module)) {
    return false;
  }
  switch (user.role) {
    case UserRole.SYSTEM_ADMIN:
      return true;
    case UserRole.MODULE_ADMIN:
      return module === 'hr' || user.module === module;
    case UserRole.MANAGER:
      return module === 'hr'
        ? user.module === AppModuleName.STORE || user.module === AppModuleName.WMS
        : user.module === module;
    default:
      return module !== 'hr' && user.module === module;
  }
}
