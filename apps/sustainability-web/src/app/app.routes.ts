import { Routes } from '@angular/router';

export const routes: Routes = [
  // {
  //   path: 'dashboard',
  //   // Verifica que la carpeta sea 'pages' y no 'Pages'
  //   loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  // },
  {
    path: 'billing',
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
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];