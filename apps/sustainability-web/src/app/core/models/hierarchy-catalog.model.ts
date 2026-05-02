/** Snapshot maestro SMS en cliente; se persiste en localStorage y se fusiona con queries AppSync donde existan. */
export const HIERARCHY_CATALOG_STORAGE_KEY = 'sms.hierarchy.catalog.v1';

export interface HierarchyCatalog {
  readonly version: 1;
  branches: BranchCatalogRow[];
  buildings: BuildingCatalogRow[];
  costCenters: CostCenterCatalogRow[];
  assets: AssetCatalogRow[];
  meters: MeterCatalogRow[];
  tariffs: TariffCatalogRow[];
  alertRules: AlertRuleCatalogRow[];
}

export interface BranchCatalogRow {
  branchId: string;
  name: string;
  region: string;
  m2Surface: number;
  facilityType: string;
  timezone: string;
  updatedAt: string;
}

export interface BuildingCatalogRow {
  branchId: string;
  buildingId: string;
  name: string;
  usageType: string;
  status: string;
  yearBuilt: number;
  m2Surface: number;
  m3Volume: number;
  hvacType: string;
  hasBms: boolean;
  updatedAt: string;
}

export interface CostCenterCatalogRow {
  id: string;
  name: string;
  branchId: string;
  method: string;
  percentage: number;
  annualBudget: number;
  updatedAt: string;
}

export interface AssetCatalogRow {
  assetId: string;
  name: string;
  category: string;
  status: string;
  nominalPower: number;
  meterId: string;
  branchId: string;
  buildingId: string;
  costCenterId: string;
  updatedAt: string;
}

export interface MeterCatalogRow {
  branchId: string;
  meterId: string;
  name: string;
  serialNumber: string;
  iotName: string;
  protocol: string;
  type: string;
  isMain: boolean;
  buildingId: string;
  updatedAt: string;
}

export interface TariffCatalogRow {
  branchId: string;
  serviceType: string;
  providerName: string;
  contractId: string;
  pricingModel: string;
  baseRate: number;
  validFrom: string;
  validTo: string;
  updatedAt: string;
}

export interface AlertRuleCatalogRow {
  branchId: string;
  entityId: string;
  alertType: string;
  name: string;
  status: string;
  priority: string;
  threshold: number;
  operator: string;
  updatedAt: string;
}

export type HierarchyAdminTab =
  | 'branch'
  | 'building'
  | 'cost-center'
  | 'asset'
  | 'meter'
  | 'tariff'
  | 'alert-rule';

export function emptyHierarchyCatalog(): HierarchyCatalog {
  return {
    version: 1,
    branches: [],
    buildings: [],
    costCenters: [],
    assets: [],
    meters: [],
    tariffs: [],
    alertRules: []
  };
}
