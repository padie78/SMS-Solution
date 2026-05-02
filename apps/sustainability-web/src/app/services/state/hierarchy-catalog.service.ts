import { Injectable, computed, signal } from '@angular/core';
import {
  emptyHierarchyCatalog,
  HIERARCHY_CATALOG_STORAGE_KEY,
  type AlertRuleCatalogRow,
  type AssetCatalogRow,
  type BranchCatalogRow,
  type BuildingCatalogRow,
  type CostCenterCatalogRow,
  type HierarchyCatalog,
  type MeterCatalogRow,
  type TariffCatalogRow
} from '../../core/models/hierarchy-catalog.model';

function nowIso(): string {
  return new Date().toISOString();
}

function parseUnknownRecord(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      const j = JSON.parse(value) as unknown;
      return typeof j === 'object' && j !== null ? (j as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function str(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function num(o: Record<string, unknown>, key: string): number {
  const x = Number(o[key]);
  return Number.isFinite(x) ? x : 0;
}

function bool(o: Record<string, unknown>, key: string): boolean {
  return Boolean(o[key]);
}

@Injectable({ providedIn: 'root' })
export class HierarchyCatalogService {
  private readonly state = signal<HierarchyCatalog>(this.loadFromStorage());

  /** Catálogo actual (solo lectura para plantillas). */
  readonly catalog = this.state.asReadonly();

  readonly regions = computed(() => {
    const set = new Set<string>();
    for (const b of this.state().branches) {
      const r = (b.region ?? '').trim();
      if (r) set.add(r);
    }
    return [...set].sort((a, x) => a.localeCompare(x));
  });

  constructor() {
    this.ensureVersion();
  }

  loadFromStorage(): HierarchyCatalog {
    if (typeof localStorage === 'undefined') {
      return emptyHierarchyCatalog();
    }
    try {
      const raw = localStorage.getItem(HIERARCHY_CATALOG_STORAGE_KEY);
      if (!raw) return emptyHierarchyCatalog();
      const parsed = JSON.parse(raw) as HierarchyCatalog;
      if (!parsed || parsed.version !== 1) return emptyHierarchyCatalog();
      return {
        version: 1,
        branches: Array.isArray(parsed.branches) ? parsed.branches : [],
        buildings: Array.isArray(parsed.buildings) ? parsed.buildings : [],
        costCenters: Array.isArray(parsed.costCenters) ? parsed.costCenters : [],
        assets: Array.isArray(parsed.assets) ? parsed.assets : [],
        meters: Array.isArray(parsed.meters) ? parsed.meters : [],
        tariffs: Array.isArray(parsed.tariffs) ? parsed.tariffs : [],
        alertRules: Array.isArray(parsed.alertRules) ? parsed.alertRules : []
      };
    } catch {
      return emptyHierarchyCatalog();
    }
  }

  persist(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(HIERARCHY_CATALOG_STORAGE_KEY, JSON.stringify(this.state()));
  }

  reset(): void {
    this.state.set(emptyHierarchyCatalog());
    this.persist();
  }

  upsertBranch(row: Omit<BranchCatalogRow, 'updatedAt'>): void {
    const next: BranchCatalogRow = { ...row, updatedAt: nowIso() };
    this.state.update((c) => {
      const i = c.branches.findIndex((x) => x.branchId === next.branchId);
      const branches = [...c.branches];
      if (i >= 0) branches[i] = next;
      else branches.push(next);
      return { ...c, branches };
    });
    this.persist();
  }

  removeBranch(branchId: string): void {
    const id = branchId.trim();
    if (!id) return;
    this.state.update((c) => ({
      ...c,
      branches: c.branches.filter((b) => b.branchId !== id),
      buildings: c.buildings.filter((b) => b.branchId !== id),
      costCenters: c.costCenters.filter((x) => x.branchId !== id),
      assets: c.assets.filter((a) => a.branchId !== id),
      meters: c.meters.filter((m) => m.branchId !== id),
      tariffs: c.tariffs.filter((t) => t.branchId !== id),
      alertRules: c.alertRules.filter((r) => r.branchId !== id)
    }));
    this.persist();
  }

  upsertBuilding(row: Omit<BuildingCatalogRow, 'updatedAt'>): void {
    const next: BuildingCatalogRow = { ...row, updatedAt: nowIso() };
    this.state.update((c) => {
      const i = c.buildings.findIndex((x) => x.branchId === next.branchId && x.buildingId === next.buildingId);
      const buildings = [...c.buildings];
      if (i >= 0) buildings[i] = next;
      else buildings.push(next);
      return { ...c, buildings };
    });
    this.persist();
  }

  removeBuilding(branchId: string, buildingId: string): void {
    const bId = branchId.trim();
    const gId = buildingId.trim();
    if (!bId || !gId) return;
    this.state.update((c) => ({
      ...c,
      buildings: c.buildings.filter((x) => !(x.branchId === bId && x.buildingId === gId)),
      assets: c.assets.filter((a) => !(a.branchId === bId && a.buildingId === gId)),
      meters: c.meters.filter((m) => !(m.branchId === bId && m.buildingId === gId))
    }));
    this.persist();
  }

  upsertCostCenter(row: Omit<CostCenterCatalogRow, 'updatedAt'>): void {
    const next: CostCenterCatalogRow = { ...row, updatedAt: nowIso() };
    this.state.update((c) => {
      const i = c.costCenters.findIndex((x) => x.id === next.id);
      const costCenters = [...c.costCenters];
      if (i >= 0) costCenters[i] = next;
      else costCenters.push(next);
      return { ...c, costCenters };
    });
    this.persist();
  }

  removeCostCenter(id: string): void {
    const cc = id.trim();
    if (!cc) return;
    this.state.update((c) => ({
      ...c,
      costCenters: c.costCenters.filter((x) => x.id !== cc),
      assets: c.assets.filter((a) => a.costCenterId !== cc)
    }));
    this.persist();
  }

  upsertAsset(row: Omit<AssetCatalogRow, 'updatedAt'>): void {
    const next: AssetCatalogRow = { ...row, updatedAt: nowIso() };
    this.state.update((c) => {
      const i = c.assets.findIndex((x) => x.assetId === next.assetId);
      const assets = [...c.assets];
      if (i >= 0) assets[i] = next;
      else assets.push(next);
      return { ...c, assets };
    });
    this.persist();
  }

  removeAsset(assetId: string): void {
    const id = assetId.trim();
    if (!id) return;
    this.state.update((c) => ({
      ...c,
      assets: c.assets.filter((a) => a.assetId !== id),
      alertRules: c.alertRules.filter((r) => r.entityId !== id)
    }));
    this.persist();
  }

  upsertMeter(row: Omit<MeterCatalogRow, 'updatedAt'>): void {
    const next: MeterCatalogRow = { ...row, updatedAt: nowIso() };
    this.state.update((c) => {
      const i = c.meters.findIndex((x) => x.branchId === next.branchId && x.meterId === next.meterId);
      const meters = [...c.meters];
      if (i >= 0) meters[i] = next;
      else meters.push(next);
      return { ...c, meters };
    });
    this.persist();
  }

  removeMeter(branchId: string, meterId: string): void {
    const b = branchId.trim();
    const m = meterId.trim();
    if (!b || !m) return;
    this.state.update((c) => ({
      ...c,
      meters: c.meters.filter((x) => !(x.branchId === b && x.meterId === m)),
      assets: c.assets.map((a) => (a.meterId === m ? { ...a, meterId: '', updatedAt: nowIso() } : a))
    }));
    this.persist();
  }

  upsertTariff(row: Omit<TariffCatalogRow, 'updatedAt'>): void {
    const next: TariffCatalogRow = { ...row, updatedAt: nowIso() };
    this.state.update((c) => {
      const i = c.tariffs.findIndex((x) => x.branchId === next.branchId && x.serviceType === next.serviceType);
      const tariffs = [...c.tariffs];
      if (i >= 0) tariffs[i] = next;
      else tariffs.push(next);
      return { ...c, tariffs };
    });
    this.persist();
  }

  removeTariff(branchId: string, serviceType: string): void {
    const b = branchId.trim();
    const s = serviceType.trim();
    if (!b || !s) return;
    this.state.update((c) => ({
      ...c,
      tariffs: c.tariffs.filter((t) => !(t.branchId === b && t.serviceType === s))
    }));
    this.persist();
  }

  upsertAlertRule(row: Omit<AlertRuleCatalogRow, 'updatedAt'>): void {
    const next: AlertRuleCatalogRow = { ...row, updatedAt: nowIso() };
    this.state.update((c) => {
      const i = c.alertRules.findIndex(
        (x) =>
          x.branchId === next.branchId &&
          x.entityId === next.entityId &&
          x.alertType === next.alertType
      );
      const alertRules = [...c.alertRules];
      if (i >= 0) alertRules[i] = next;
      else alertRules.push(next);
      return { ...c, alertRules };
    });
    this.persist();
  }

  removeAlertRule(branchId: string, entityId: string, alertType: string): void {
    const b = branchId.trim();
    const e = entityId.trim();
    const a = alertType.trim();
    if (!b || !e || !a) return;
    this.state.update((c) => ({
      ...c,
      alertRules: c.alertRules.filter((r) => !(r.branchId === b && r.entityId === e && r.alertType === a))
    }));
    this.persist();
  }

  /** Interpreta filas devueltas por `getCostCenters` (AWSJSON heterogéneo). */
  mergeCostCentersFromApi(rows: readonly unknown[]): number {
    let n = 0;
    this.state.update((c) => {
      const byId = new Map(c.costCenters.map((x) => [x.id, x]));
      for (const raw of rows) {
        const o = parseUnknownRecord(raw);
        if (!o) continue;
        let id = str(o, 'id', 'ccId');
        const sk = str(o, 'SK');
        if (!id && sk.includes('COST_CENTER#')) {
          id = sk.replace(/^.*COST_CENTER#/, '').trim();
        }
        const cc_info = parseUnknownRecord(o['cc_info']);
        const allocation = parseUnknownRecord(o['allocation_rules']);
        const budget = parseUnknownRecord(o['budget_config']);
        const name =
          str(o, 'name') ||
          (cc_info ? str(cc_info, 'name') : '') ||
          id ||
          'Cost center';
        const branchId =
          str(o, 'branchId', 'parent_branch') ||
          (cc_info ? str(cc_info, 'parent_branch') : '') ||
          '';
        const method =
          str(o, 'method') || (allocation ? str(allocation, 'allocation_method') : '') || 'SQUARE_METERS';
        const percentage = num(o, 'percentage') || (allocation ? num(allocation, 'allocation_percentage') : 0);
        const annualBudget =
          num(o, 'annualBudget') || (budget ? num(budget, 'annual_budget_cap') : 0);
        if (!id) continue;
        const row: CostCenterCatalogRow = {
          id,
          name,
          branchId,
          method,
          percentage,
          annualBudget,
          updatedAt: str(o, 'last_updated', 'lastUpdated') || nowIso()
        };
        byId.set(id, row);
        n++;
      }
      return { ...c, costCenters: [...byId.values()] };
    });
    this.persist();
    return n;
  }

  mergeTariffsFromApi(branchId: string, rows: readonly unknown[]): number {
    const b = branchId.trim();
    if (!b) return 0;
    let n = 0;
    this.state.update((c) => {
      const kept = c.tariffs.filter((t) => t.branchId !== b);
      const incoming: TariffCatalogRow[] = [];
      for (const raw of rows) {
        const o = parseUnknownRecord(raw);
        if (!o) continue;
        const serviceType = str(o, 'serviceType', 'service', 'type') || 'ELECTRICITY';
        incoming.push({
          branchId: b,
          serviceType,
          providerName: str(o, 'providerName', 'provider'),
          contractId: str(o, 'contractId', 'contract'),
          pricingModel: str(o, 'pricingModel', 'model'),
          baseRate: num(o, 'baseRate') || num(o, 'rate'),
          validFrom: str(o, 'validFrom', 'from'),
          validTo: str(o, 'validTo', 'to'),
          updatedAt: str(o, 'last_updated', 'updatedAt') || nowIso()
        });
        n++;
      }
      return { ...c, tariffs: [...kept, ...incoming] };
    });
    this.persist();
    return n;
  }

  private ensureVersion(): void {
    const c = this.state();
    if (!c.version) {
      this.state.set({ ...emptyHierarchyCatalog(), ...c, version: 1 });
      this.persist();
    }
  }
}
