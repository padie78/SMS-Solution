import type { Routes } from '@angular/router';
import { SETUP_PAGE_REGISTRY, type SetupPageKey } from './setup-pages.registry';

const SETUP_KEYS = Object.keys(SETUP_PAGE_REGISTRY) as SetupPageKey[];

export const setupRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'hub' },
  {
    path: 'hub',
    loadComponent: () =>      import('@pages/setup/setup-hub.component').then((m) => m.SetupHubComponent),
    title: 'SMS - Configuración maestra'
  },
  {
    path: 'locations',
    loadComponent: () =>
      import('@pages/setup/setup-locations-hub.component').then((m) => m.SetupLocationsHubComponent),
    title: 'SMS - Ubicaciones y activos'
  },
  {
    path: 'hierarchy',
    loadComponent: () =>
      import('@pages/setup/setup-hierarchy-admin.component').then((m) => m.SetupHierarchyAdminComponent),
    title: 'SMS - Árbol jerárquico'
  },
  ...SETUP_KEYS.map((key) => ({
    path: key,
    loadComponent: () =>
      import('@pages/setup/setup-mutation-shell.component').then((m) => m.SetupMutationShellComponent),
    data: { setupPage: key },
    title: `SMS - ${SETUP_PAGE_REGISTRY[key].title}`
  }))
];
