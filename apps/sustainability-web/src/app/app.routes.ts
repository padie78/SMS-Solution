import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { setupRoutes } from './pages/setup/setup.routes';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'SMS - Login'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'SMS - Dashboard',
    canActivate: [authGuard]
  },
  {
    path: 'billing',
    canActivate: [authGuard],
    children: [
      {
        path: 'invoices',
        // Asegúrate de que la ruta coincida con la carpeta física
        loadComponent: () => import('./pages/billing/invoice-manager/invoice-manager.component').then(m => m.InvoiceManagerComponent),
        title: 'SMS - Invoice Management'
      },
      {
        path: 'invoices/new',
        // Ruta para el Stepper que acabamos de crear
        loadComponent: () => import('./pages/billing/invoice-create/invoice-create.component').then(m => m.InvoiceCreateComponent),
        title: 'SMS - New Invoice'
      }
    ]
  },
  {
    path: 'setup',
    canActivate: [authGuard],
    children: setupRoutes
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];