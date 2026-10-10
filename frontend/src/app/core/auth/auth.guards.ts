import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { canAccessModule, landingUrl } from './access';
import { AccessModule, Role } from './auth.model';
import { AuthService } from './auth.service';

// Any logged-in company user (the superuser has his own area).
export const companyUserGuard: CanActivateFn = () => {
  const user = inject(AuthService).user();
  const router = inject(Router);

  if (!user) {
    return router.parseUrl('/login');
  }
  return user.role === 'superuser' ? router.parseUrl('/superadmin') : true;
};

export const superuserGuard: CanActivateFn = () => {
  const user = inject(AuthService).user();
  return user?.role === 'superuser' ? true : inject(Router).parseUrl('/superadmin/login');
};

// "/" sends each user to the first page that suits them.
export const landingGuard: CanActivateFn = () => {
  const user = inject(AuthService).user();
  return inject(Router).parseUrl(user ? landingUrl(user) : '/login');
};

// A module's pages, optionally limited to some roles.
export function accessGuard(module: AccessModule, roles?: Role[]): CanActivateFn {
  return () => {
    const user = inject(AuthService).user();
    const allowed = canAccessModule(user, module) && (!roles || (!!user && roles.includes(user.role)));
    return allowed || inject(Router).parseUrl(user ? landingUrl(user) : '/login');
  };
}
