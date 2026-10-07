import { Routes } from '@angular/router';

// HR submodules, served under /hr (see app.routes.ts).
export default [
  { path: '', pathMatch: 'full', redirectTo: 'employees' },
  {
    path: 'employees',
    loadComponent: () =>
      import('./employees/employees-list/employees-list').then((m) => m.EmployeesList),
    data: { demoValue: 'Hello from the route' },
  },
] satisfies Routes;
