import { Routes } from '@angular/router';
import { accessGuard } from '../../core/auth/auth.guards';

export default [
  { path: '', pathMatch: 'full', redirectTo: 'cash-register' },
  {
    path: 'stores',
    canActivate: [accessGuard('store', ['system_admin', 'module_admin', 'manager'])],
    loadComponent: () => import('./stores/stores-list/stores-list').then((m) => m.StoresList),
  },
  {
    path: 'cash-register/cash-register-history',
    loadComponent: () =>
      import('./cash-register/cash-register-history/cash-register-history').then(
        (m) => m.CashRegisterHistoryPage,
      ),
  },
  {
    path: 'cash-register',
    loadComponent: () =>
      import('./cash-register/ongoing/cash-register-ongoing').then((m) => m.OngoingPage),
  },
  {
    path: 'cash-register/:id',
    loadComponent: () => import('./cash-register/shift-view/shift-view').then((m) => m.ShiftView),
  },
  {
    path: 'pos',
    canActivate: [accessGuard('store', ['manager', 'cashier'])],
    loadComponent: () => import('./pos/pos-page/pos-page').then((m) => m.PosPage),
  },
  {
    path: 'sales',
    loadComponent: () => import('./sales/sales-list/sales-list').then((m) => m.SalesList),
  },
  {
    path: 'sales/:id',
    loadComponent: () => import('./sales/sale-view/sale-view').then((m) => m.SaleView),
  },
  {
    path: 'reports',
    canActivate: [accessGuard('store', ['system_admin', 'module_admin', 'manager'])],
    loadComponent: () => import('./reports/reports-page/reports-page').then((m) => m.ReportsPage),
  },
  {
    path: 'record-expense',
    loadComponent: () =>
      import('./record-expense/record-expense-page/record-expense-page').then(
        (m) => m.RecordExpensePage,
      ),
  },
  {
    path: 'child',
    loadComponent: () => import('./child/child').then((m) => m.Child),
  },
  {
    path: 'parent',
    loadComponent: () => import('./parent/parent').then((m) => m.Parent),
  },
] satisfies Routes;
