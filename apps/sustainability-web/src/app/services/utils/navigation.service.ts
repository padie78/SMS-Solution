import { Injectable } from '@angular/core';
import type { MenuItem } from 'primeng/api';
import type { AppNavIntentKey } from '../../core/navigation/app-nav.model';

/**
 * Canonical routes — modular prefixes: `/ops`, `/assets`, `/strategy`, `/compliance`.
 * Domain alignment: Asset, Meter, Invoice, EmissionFactor, Location (@sms/common).
 */
export const APP_ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  opsIncidents: '/ops/incidents',
  opsTelemetry: '/ops/telemetry',
  opsDataHealth: '/ops/data-health',
  assetsHealth: '/assets/health',
  assetsMaintenance: '/assets/maintenance',
  assetsDigitalTwin: '/assets/digital-twin',
  assetsBenchmarking: '/assets/benchmarking',
  assetsMeters: '/assets/meters',
  strategyCopilot: '/strategy/copilot',
  strategyWhatIf: '/strategy/what-if',
  strategyEmissions: '/strategy/emissions',
  strategyDecarbonization: '/strategy/decarbonization',
  complianceInvoices: '/compliance/invoices',
  complianceInvoicesNew: '/compliance/invoices/new',
  complianceReporting: '/compliance/reporting',
  complianceEvidence: '/compliance/evidence',
  complianceLocations: '/compliance/locations',
  complianceAccess: '/compliance/access',
  complianceSettings: '/compliance/settings',
  /** Legacy billing — redirects in `app.routes` to compliance invoices. */
  billingInvoices: '/billing/invoices',
  billingInvoicesNew: '/billing/invoices/new',
  profile: '/profile',
  labs: '/labs'
} as const;

export type AppRouteKey = keyof typeof APP_ROUTES;

const SMS_NAV_BADGE_INCIDENTS = 'smsNavBadge:incidents';

export type SidebarPillarId = 'ops' | 'assets' | 'strategy' | 'compliance' | 'system';

export interface SidebarNavSection {
  readonly id: SidebarPillarId;
  /** Uppercase pillar label (Pinecone-style section headers). */
  readonly label: string;
  /** Flat leaves only — `routerLink` on each item. */
  readonly items: MenuItem[];
}

function pathMatches(urlPath: string, routerLink: string | string[] | undefined): boolean {
  if (routerLink === undefined) return false;
  const raw = Array.isArray(routerLink) ? routerLink.join('/') : routerLink;
  const link = raw.startsWith('/') ? raw : `/${raw}`;
  if (link === APP_ROUTES.dashboard) {
    return urlPath === APP_ROUTES.dashboard || urlPath === '/';
  }
  return urlPath === link || urlPath.startsWith(`${link}/`);
}

function applyIncidentBadge(items: MenuItem[] | undefined, count: number): void {
  if (!items?.length) return;
  const badge = count > 0 ? String(count) : undefined;
  for (const item of items) {
    const data = item['data'] as { smsNavBadge?: string } | undefined;
    if (data?.smsNavBadge === SMS_NAV_BADGE_INCIDENTS) {
      item.badge = badge;
      item.badgeStyleClass = badge
        ? 'p-badge p-component p-badge-danger sms-nav-route-badge'
        : undefined;
    }
    applyIncidentBadge(item.items, count);
  }
}

function intentForUrl(rawUrl: string): AppNavIntentKey {
  const path = rawUrl.split('?')[0].toLowerCase();
  if (path.startsWith('/ops') || path === '/dashboard' || path === '/' || path.startsWith('/dashboard/')) {
    return 'ops';
  }
  if (path.startsWith('/assets')) return 'assets';
  if (path.startsWith('/strategy')) return 'strategy';
  if (
    path.startsWith('/compliance') ||
    path.startsWith('/trust') ||
    path.startsWith('/billing') ||
    path.startsWith('/setup')
  ) {
    return 'compliance';
  }
  return 'ops';
}

/** Sidebar sections — flat `MenuItem` leaves per section (fixed sidebar / custom nav). */
function buildSidebarNavSectionsTemplate(): readonly SidebarNavSection[] {
  return [
    {
      id: 'ops',
      label: 'LIVE OPERATIONS',
      items: [
        {
          label: 'Incident Center',
          icon: 'pi pi-exclamation-triangle',
          routerLink: APP_ROUTES.opsIncidents,
          title: 'High-priority monitoring; anomalies and alert triage.',
          data: { domain: 'Alert', smsNavBadge: SMS_NAV_BADGE_INCIDENTS }
        },
        {
          label: 'Global Dashboard',
          icon: 'pi pi-th-large',
          routerLink: APP_ROUTES.dashboard,
          title: 'Global ESG dashboard and real-time KPI trackers.',
          data: { domain: 'KPI', routeKey: 'dashboard' }
        },
        {
          label: 'IoT Telemetry',
          icon: 'pi pi-chart-line',
          routerLink: APP_ROUTES.opsTelemetry,
          title: 'Live energy, water, gas, and steam feeds (Meter @sms/common).',
          data: { domain: 'Meter' }
        }
      ]
    },
    {
      id: 'assets',
      label: 'ASSET PERFORMANCE',
      items: [
        {
          label: 'Asset Health',
          icon: 'pi pi-heart',
          routerLink: APP_ROUTES.assetsHealth,
          title: 'Real-time status and efficiency of critical machinery (Asset @sms/common).',
          data: { domain: 'Asset' }
        },
        {
          label: 'Predictive Maintenance',
          icon: 'pi pi-wrench',
          routerLink: APP_ROUTES.assetsMaintenance,
          title: 'AI-driven insights to prevent energy spikes and equipment failure.',
          data: { domain: 'Asset' }
        },
        {
          label: 'Digital Twin',
          icon: 'pi pi-objects-column',
          routerLink: APP_ROUTES.assetsDigitalTwin,
          title: 'Visual infrastructure mapping and load simulation.',
          data: { domain: 'Asset' }
        },
        {
          label: 'Benchmarking',
          icon: 'pi pi-percentage',
          routerLink: APP_ROUTES.assetsBenchmarking,
          title: 'Comparative performance across plants or sites (Location-aware).',
          data: { domain: 'Location' }
        }
      ]
    },
    {
      id: 'strategy',
      label: 'CLIMATE INTELLIGENCE',
      items: [
        {
          label: 'Sustainability Copilot (AI)',
          icon: 'pi pi-comments',
          routerLink: APP_ROUTES.strategyCopilot,
          title: 'RAG-powered assistant for natural language data interrogation.',
          data: { domain: 'ESG' }
        },
        {
          label: 'What-if Simulator',
          icon: 'pi pi-sync',
          routerLink: APP_ROUTES.strategyWhatIf,
          title: 'Consumption forecasting and infrastructure change modeling.',
          data: { domain: 'ESG' }
        },
        {
          label: 'Emission Ledger',
          icon: 'pi pi-list',
          routerLink: APP_ROUTES.strategyEmissions,
          title: 'Carbon footprint breakdown — GHG Protocol (EmissionFactor @sms/common).',
          data: { domain: 'EmissionFactor' }
        },
        {
          label: 'Roadmap',
          icon: 'pi pi-compass',
          routerLink: APP_ROUTES.strategyDecarbonization,
          title: 'Net-zero planning and progress tracking.',
          data: { domain: 'EmissionFactor' }
        }
      ]
    },
    {
      id: 'compliance',
      label: 'TRUST & COMPLIANCE',
      items: [
        {
          label: 'Invoice Command',
          icon: 'pi pi-file-import',
          routerLink: APP_ROUTES.complianceInvoices,
          title: 'OCR utility bills, reconciliation, and tariff optimization (Invoice @sms/common).',
          data: { domain: 'Invoice' }
        },
        {
          label: 'Reporting Factory',
          icon: 'pi pi-file-export',
          routerLink: APP_ROUTES.complianceReporting,
          title: 'One-click exports: ISO 14064, GHG Protocol, GRI.',
          data: { domain: 'ESG' }
        },
        {
          label: 'Evidence Vault',
          icon: 'pi pi-lock',
          routerLink: APP_ROUTES.complianceEvidence,
          title: 'Immutable audit trail for certifications and disclosures.',
          data: { domain: 'Audit' }
        }
      ]
    },
    {
      id: 'system',
      label: 'SYSTEM CONFIG',
      items: [
        {
          label: 'Location Manager',
          icon: 'pi pi-sitemap',
          routerLink: APP_ROUTES.complianceLocations,
          title: 'Region → Branch → Building hierarchy (Location @sms/common).',
          data: { domain: 'Location' }
        },
        {
          label: 'Settings',
          icon: 'pi pi-cog',
          routerLink: APP_ROUTES.complianceSettings,
          title: 'Platform configuration, integrations, and workspace preferences.',
          data: { domain: 'Governance' }
        }
      ]
    }
  ];
}

export interface NavigationMenuModelContext {
  /** Current router URL (query string is ignored for matching). */
  url: string;
  /** Incident Center badge when count is greater than zero. */
  incidentBadgeCount?: number;
}

@Injectable({ providedIn: 'root' })
export class NavigationService {
  readonly routes = APP_ROUTES;

  private readonly sidebarTemplate = buildSidebarNavSectionsTemplate();

  path(key: AppRouteKey): string {
    return APP_ROUTES[key];
  }

  /** Current strategic pillar for analytics / header context. */
  activeIntent(url: string): AppNavIntentKey {
    return intentForUrl(url);
  }

  /** Whether `routerLink` is active for the given URL (includes `/` as dashboard). */
  isActivePath(routerUrl: string, routerLink: string | string[] | undefined): boolean {
    const path = routerUrl.split('?')[0];
    return pathMatches(path, routerLink);
  }

  /**
   * Sidebar sections — pillars plus `system` config; optional incident badge on Incident Center.
   */
  getSidebarSections(ctx: NavigationMenuModelContext): SidebarNavSection[] {
    const sections = structuredClone(this.sidebarTemplate) as SidebarNavSection[];
    for (const s of sections) {
      applyIncidentBadge(s.items, ctx.incidentBadgeCount ?? 0);
    }
    return sections;
  }
}
