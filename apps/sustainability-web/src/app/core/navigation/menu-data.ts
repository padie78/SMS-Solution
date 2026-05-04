import type { UserMenuConfigEntry } from './app-nav.model';

/**
 * Header user menu — routes aligned with modular app shell (`/compliance/*`, `/setup/*`).
 */
export const USER_MENU_CONFIG: readonly UserMenuConfigEntry[] = [
  {
    label: 'Personal',
    items: [
      { label: 'User Profile', icon: 'pi pi-user-edit', routerLink: '/profile' },
      { label: 'Preferences', icon: 'pi pi-sliders-h', routerLink: '/settings/preferences' },
      { label: 'Notifications', icon: 'pi pi-bell', routerLink: '/settings/notifications' }
    ]
  },
  {
    label: 'Workspaces & Admin',
    items: [
      { label: 'Location Manager', icon: 'pi pi-map-marker', routerLink: '/compliance/locations' },
      { label: 'Users & Access', icon: 'pi pi-users', routerLink: '/setup/user' },
      { label: 'Audit Logs', icon: 'pi pi-history', routerLink: '/admin/logs' }
    ]
  },
  {
    label: 'Billing & Quotas',
    items: [
      {
        label: 'Plan & Subscription',
        icon: 'pi pi-credit-card',
        badge: 'PRO',
        routerLink: '/billing/plan'
      },
      {
        label: 'Carbon Credits',
        icon: 'pi pi-cloud',
        badge: '1.2k',
        routerLink: '/billing/credits'
      },
      { label: 'API / IoT Usage', icon: 'pi pi-bolt', routerLink: '/billing/usage' }
    ]
  },
  { separator: true },
  {
    label: 'Labs & Beta Features',
    icon: 'pi pi-flask',
    routerLink: '/labs',
    styleClass: 'text-emerald-600 font-bold',
    action: 'none'
  },
  {
    label: 'Sign Out',
    icon: 'pi pi-sign-out',
    action: 'signOut'
  }
] as const;
