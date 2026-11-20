import { Routes } from '@angular/router';

export default [
  { path: '', pathMatch: 'full', redirectTo: 'counterparties' },
  { path: 'partners', pathMatch: 'full', redirectTo: 'counterparties' },
  {
    path: 'counterparties',
    loadComponent: () => import('./counterparties/counterparties-list/counterparties-list').then((m) => m.CounterpartiesList),
  },
  {
    path: 'counterparties/:id',
    loadComponent: () => import('./counterparties/counterparty-view/counterparty-view').then((m) => m.CounterpartyView),
  },
] satisfies Routes;
