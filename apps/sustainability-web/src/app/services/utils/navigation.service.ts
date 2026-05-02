import { Injectable } from '@angular/core';

/**
 * Central map of app routes — use instead of scattering string literals.
 * Paths must match `Router` configuration.
 */
export const APP_ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  billingInvoices: '/billing/invoices',
  billingInvoicesNew: '/billing/invoices/new',
  profile: '/profile',
  labs: '/labs'
} as const;

export type AppRouteKey = keyof typeof APP_ROUTES;

@Injectable({ providedIn: 'root' })
export class NavigationService {
  readonly routes = APP_ROUTES;

  path(key: AppRouteKey): string {
    return APP_ROUTES[key];
  }
}
