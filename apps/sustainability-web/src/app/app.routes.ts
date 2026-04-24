import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  // Grupo de Facturación con Lazy Loading
  {
    path: 'billing',
    children: [
      {
        path: 'invoices',
        loadComponent: () => import('./pages/billing/invoice-manager/invoice-manager.component').then(m => m.InvoiceManagerComponent),
        title: 'SMS - Invoice Management'
      },
      {
        path: 'reconciliation',
        loadComponent: () => import('./pages/billing/reconciliation/reconciliation.component').then(m => m.ReconciliationComponent),
        title: 'SMS - Bill Reconciliation'
      }
    ]
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];