import { AppModuleName } from '../companies/app-module.enum.js';
import { UserRole } from './user-role.enum.js';

// The logged-in user as seen by controllers and services (`@CurrentUser()`). A class rather than
// an interface so decorated parameters of this type can be emitted as metadata.
export class AuthUser {
  userId!: string;
  username!: string;
  displayName!: string;
  role!: UserRole;
  module!: AppModuleName | null;
  companyId!: string | null; // null only for the superuser
  companyName!: string | null;
  companyModules!: AppModuleName[]; // modules the company bought
  employeeId!: string | null;
}

// What the frontend gets after login.
export class SessionUser {
  username!: string;
  displayName!: string;
  role!: UserRole;
  module!: AppModuleName | null;
  companyName!: string | null;
  companyModules!: AppModuleName[];
}

export function toSessionUser(user: AuthUser): SessionUser {
  return {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    module: user.module,
    companyName: user.companyName,
    companyModules: user.companyModules,
  };
}
