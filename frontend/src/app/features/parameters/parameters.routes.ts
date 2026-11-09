import { Routes } from '@angular/router';

export default [
  { path: '', pathMatch: 'full', redirectTo: 'partners' },
  {
    path: 'partners',
    loadComponent: () => import('./partners/partners-list/partners-list').then((m) => m.PartnersList),
  },
] satisfies Routes;
