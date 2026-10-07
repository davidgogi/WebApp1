import { Routes } from '@angular/router';
import { NotFoundPage } from './layout/not-found/not-found-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'hr/employees' },

  { path: 'hr', loadChildren: () => import('./features/hr/hr.routes') },
  { path: 'wms', loadChildren: () => import('./features/wms/wms.routes') },

  { path: '**', component: NotFoundPage },
];
