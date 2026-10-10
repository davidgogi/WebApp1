import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { AppModuleName } from '../companies/app-module.enum.js';
import { AuthUser } from './auth-user.js';
import { UserRole } from './user-role.enum.js';

export type AccessModule = 'hr' | AppModuleName;

export const IS_PUBLIC = 'isPublic';
export const ACCESS_MODULE = 'accessModule';
export const ROLES = 'roles';

// No login needed (the login endpoints).
export const Public = () => SetMetadata(IS_PUBLIC, true);
// On a controller: which module's data it serves. The guard checks the company bought it and
// that the user works in it.
export const Access = (module: AccessModule) => SetMetadata(ACCESS_MODULE, module);
// On a controller or handler: only these roles may call it.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
