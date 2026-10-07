import { Routes } from '@angular/router';

export default [
  { path: '', pathMatch: 'full', redirectTo: 'warehouses' },
  {
    path: 'warehouses',
    loadComponent: () =>
      import('./warehouses/warehouses-list/warehouses-list').then((m) => m.WarehousesList),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./products/products-list/products-list').then((m) => m.ProductsList),
  },
] satisfies Routes;
