import type { AppNavGroup, UserMenuConfigEntry } from './app-nav.model';

export const MENU_GROUPS: readonly AppNavGroup[] = [
  {
    label: 'Real-Time Monitoring',
    items: [
      { label: 'Global Dashboard', icon: 'pi pi-chart-bar', route: '/dashboard' },
      { label: 'IoT & Smart Metering', icon: 'pi pi-bolt', route: '/iot' },
      { label: 'Virtual Meters', icon: 'pi pi-calculator', route: '/virtual-meters' }
    ]
  },
  {
    label: 'AI & Strategy',
    items: [
      { label: 'Sustainability AI Chat', icon: 'pi pi-comments', route: '/ai-chat' },
      { label: 'Infra Simulator', icon: 'pi pi-map', route: '/simulator' },
      { label: 'Climate Risk Map', icon: 'pi pi-compass', route: '/climate-map' }
    ]
  },
  {
    label: 'Operations & Assets',
    items: [
      { label: 'Location Management', icon: 'pi pi-sitemap', route: '/assets' },
      { label: 'Action Plan (Kanban)', icon: 'pi pi-list', route: '/kanban' },
      { label: 'Supply Chain (Scope 3)', icon: 'pi pi-truck', route: '/supply-chain' }
    ]
  },
  {
    label: 'Data & Evidence',
    items: [
      { label: 'Invoice Intake', icon: 'pi pi-file-import', route: '/billing/invoices' },
      { label: 'Bill Reconciliation', icon: 'pi pi-check-circle', route: '/reconciliation' },
      { label: 'Auditability Vault', icon: 'pi pi-lock', route: '/vault' }
    ]
  }
] as const;

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
      { label: 'Location Management', icon: 'pi pi-map-marker', routerLink: '/admin/locations' },
      { label: 'Users & Access', icon: 'pi pi-users', routerLink: '/admin/users' },
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
