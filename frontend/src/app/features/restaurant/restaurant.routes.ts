import { Routes } from '@angular/router';

export default [
  { path: '', pathMatch: 'full', redirectTo: 'table-service' },
  {
    path: 'table-service',
    loadComponent: () =>
      import('./table-service/table-service-page/table-service-page').then(
        (m) => m.TableServicePage,
      ),
  },
  {
    path: 'menu-management',
    loadComponent: () =>
      import('./menu-management/menu-management-page/menu-management-page').then(
        (m) => m.MenuManagementPage,
      ),
  },
  {
    path: 'kitchen-screen',
    loadComponent: () =>
      import('./kitchen-screen/kitchen-screen-page/kitchen-screen-page').then(
        (m) => m.KitchenScreenPage,
      ),
  },
  {
    path: 'waiter-view',
    loadComponent: () =>
      import('./waiter-view/waiter-view-page/waiter-view-page').then((m) => m.WaiterViewPage),
  },
] satisfies Routes;
