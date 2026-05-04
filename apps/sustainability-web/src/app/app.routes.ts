import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { setupRoutes } from './pages/setup/setup.routes';

function navPlaceholder(
  segment: string,
  navTitle: string,
  navSubtitle: string,
  navBadge = 'Industrial UX'
): Routes[number] {
  return {
    path: segment,
    loadComponent: () =>
      import('./features/route-placeholder/route-placeholder.component').then(
        (m) => m.RoutePlaceholderComponent
      ),
    data: { navTitle, navSubtitle, navBadge },
    title: `SMS - ${navTitle}`
  };
}

/** Legacy modular paths → current `/strategy/*` and `/compliance/*`. */
const legacyNavRedirects: Routes = [
  { path: 'intelligence/copilot', redirectTo: '/strategy/copilot', pathMatch: 'full' },
  { path: 'intelligence/what-if', redirectTo: '/strategy/what-if', pathMatch: 'full' },
  { path: 'intelligence/decarbonization', redirectTo: '/strategy/decarbonization', pathMatch: 'full' },
  { path: 'intelligence', redirectTo: '/strategy/copilot', pathMatch: 'full' },
  { path: 'trust/invoices/new', redirectTo: '/compliance/invoices/new', pathMatch: 'full' },
  { path: 'trust/invoices', redirectTo: '/compliance/invoices', pathMatch: 'full' },
  { path: 'trust/evidence', redirectTo: '/compliance/evidence', pathMatch: 'full' },
  { path: 'trust/locations', redirectTo: '/compliance/locations', pathMatch: 'full' },
  { path: 'trust/settings', redirectTo: '/compliance/settings', pathMatch: 'full' },
  { path: 'trust', redirectTo: '/compliance/invoices', pathMatch: 'full' }
];

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
  ...legacyNavRedirects,
  {
    path: 'ops',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'incidents' },
      navPlaceholder(
        'incidents',
        'Incident & Alerts',
        'High-priority monitoring, anomaly triage, and operational response.',
        'Live ops'
      ),
      {
        path: 'telemetry',
        loadComponent: () =>
          import('./pages/setup/setup-mutation-shell.component').then(
            (m) => m.SetupMutationShellComponent
          ),
        data: { setupPage: 'meter' },
        title: 'SMS - IoT Telemetry Hub'
      },
      navPlaceholder(
        'data-health',
        'Data Health Monitor',
        'Telemetry completeness, sensor connectivity, and gap analysis (Meter domain).',
        'Data quality'
      )
    ]
  },
  {
    path: 'assets',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'health' },
      navPlaceholder(
        'health',
        'Asset Health Scorecard',
        'Real-time status and efficiency of critical machinery (Asset @sms/common).',
        'Asset'
      ),
      navPlaceholder(
        'maintenance',
        'Predictive Maintenance',
        'AI-driven work orders and prevention of energy spikes (Asset @sms/common).',
        'Asset'
      ),
      navPlaceholder(
        'digital-twin',
        'Digital Twin & Canvas',
        'Visual infrastructure mapping and load simulation.',
        'Asset'
      ),
      navPlaceholder(
        'benchmarking',
        'Portfolio Benchmarking',
        'Comparative performance across plants or sites (Location-aware).',
        'Portfolio'
      ),
      {
        path: 'meters',
        loadComponent: () =>
          import('./pages/setup/setup-mutation-shell.component').then(
            (m) => m.SetupMutationShellComponent
          ),
        data: { setupPage: 'meter' },
        title: 'SMS - Meter Management'
      }
    ]
  },
  {
    path: 'strategy',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'copilot' },
      navPlaceholder(
        'copilot',
        'Sustainability Copilot',
        'RAG-powered natural language interrogation over ESG and operational data.',
        'AI'
      ),
      navPlaceholder(
        'what-if',
        'Simulation & What-if',
        'Consumption forecasting and infrastructure change modeling.',
        'AI'
      ),
      navPlaceholder(
        'emissions',
        'Emission Ledger (Scopes 1–3)',
        'Carbon footprint ledger aligned with GHG Protocol (EmissionFactor @sms/common).',
        'Climate'
      ),
      {
        path: 'decarbonization',
        loadComponent: () =>
          import('./pages/setup/setup-mutation-shell.component').then(
            (m) => m.SetupMutationShellComponent
          ),
        data: { setupPage: 'emission-factor' },
        title: 'SMS - Decarbonization Roadmap'
      }
    ]
  },
  {
    path: 'compliance',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'invoices' },
      {
        path: 'invoices',
        loadComponent: () =>
          import('./pages/billing/invoice-manager/invoice-manager.component').then(
            (m) => m.InvoiceManagerComponent
          ),
        title: 'SMS - Invoice Command Center'
      },
      {
        path: 'invoices/new',
        loadComponent: () =>
          import('./pages/billing/invoice-create/invoice-create.component').then(
            (m) => m.InvoiceCreateComponent
          ),
        title: 'SMS - New Invoice'
      },
      navPlaceholder(
        'reporting',
        'Reporting Factory',
        'One-click compliance exports: ISO 14064, GHG Protocol, and GRI.',
        'Compliance'
      ),
      navPlaceholder(
        'evidence',
        'Evidence Vault',
        'Immutable audit trail for certifications and regulatory evidence.',
        'Trust'
      ),
      {
        path: 'locations',
        loadComponent: () =>
          import('./pages/setup/setup-hierarchy-admin.component').then(
            (m) => m.SetupHierarchyAdminComponent
          ),
        title: 'SMS - Location Manager'
      },
      navPlaceholder(
        'access',
        'RBAC & Access',
        'Role-based access control and organizational security boundaries.',
        'Governance'
      ),
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/setup/setup-hub.component').then((m) => m.SetupHubComponent),
        title: 'SMS - System Settings'
      }
    ]
  },
  {
    path: 'billing',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: '/compliance/invoices' },
      { path: 'invoices', redirectTo: '/compliance/invoices', pathMatch: 'full' },
      { path: 'invoices/new', redirectTo: '/compliance/invoices/new', pathMatch: 'full' }
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
