import { AsyncLocalStorage } from 'node:async_hooks';
import { AuthUser } from '../auth/auth-user.js';
import { UserRole } from '../auth/user-role.enum.js';

export interface TenantScope {
  companyId: string | null;
  allCompanies: boolean;
}

const storage = new AsyncLocalStorage<TenantScope>();

export function runInRequestScope(next: () => void): void {
  storage.run({ companyId: null, allCompanies: false }, next);
}

export function scopeTo(user: Pick<AuthUser, 'role' | 'companyId'>): void {
  const scope = storage.getStore();
  if (!scope) {
    return;
  }
  scope.allCompanies = user.role === UserRole.SUPERUSER;
  scope.companyId = scope.allCompanies ? null : user.companyId;
}

export function acrossCompanies<T>(work: () => Promise<T>): Promise<T> {
  return storage.run({ companyId: null, allCompanies: true }, work);
}

export function currentScope(): TenantScope | undefined {
  return storage.getStore();
}
