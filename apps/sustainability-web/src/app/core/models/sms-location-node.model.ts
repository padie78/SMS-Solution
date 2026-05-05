import type { TreeNode } from 'primeng/api';

export type SmsLocationNodeType =
  | 'REGION'
  | 'BRANCH'
  | 'BUILDING'
  | 'COST_CENTER'
  | 'ASSET'
  | 'METER';

export type SmsNodeStatus = 'ACTIVE' | 'ALERT' | 'MAINTENANCE';

export interface SmsConsumptionData {
  last30d_kwh?: number | null;
  last30d_cost_usd?: number | null;
  last30d_co2e_kg?: number | null;
  lastUpdatedAt?: string | null;
}

export interface SmsEnvironmentalImpact {
  scope1_co2e_kg?: number | null;
  scope2_co2e_kg?: number | null;
  scope3_co2e_kg?: number | null;
  intensity_kgco2e_per_kwh?: number | null;
  methodology?: string | null;
}

export interface SmsLocationNodeMetadata {
  /** RegionDTO */
  code?: string | null;

  /** BranchDTO */
  regionLabel?: string | null;
  facilityType?: string | null;
  /** Utility identifier (e.g., ES... / AR...). Usually applies to Meter / Asset. */
  cups?: string | null;
  serialNumber?: string | null;
  iotName?: string | null;
  protocol?: string | null;
  timezone?: string | null;

  /** BuildingDTO */
  usageType?: string | null;
  usageTypeEnum?: string | null;
  operationalStatus?: string | null;
  yearBuilt?: number | null;
  m2Surface?: number | null;
  m3Volume?: number | null;
  hvacType?: string | null;
  hasBms?: boolean | null;

  /** CostCenterDTO */
  allocationMethod?: string | null;
  percentage?: number | null;
  annualBudget?: number | null;

  /** AssetDTO */
  assetType?: string | null;
  assetStatus?: string | null;
  nominalPower?: number | null;
  nominalPower_kw?: number | null;

  /** MeterDTO */
  meterType?: string | null;
  isMain?: boolean | null;

  tags?: string[] | null;
  /** Ad-hoc properties to prototype without backend schema migrations. */
  custom?: Record<string, string> | null;
}

/**
 * UI node for PrimeNG Tree with SMS-specific metadata.
 * Notes:
 * - `key` is required by PrimeNG for stable identity (we map it to `location_id`).
 * - Lazy loading uses `leaf=false` and `children` omitted until expanded.
 */
export interface SmsLocationNode extends TreeNode {
  location_id: string;
  tenant_id?: string;
  type: SmsLocationNodeType;
  name: string;
  status?: SmsNodeStatus;
  parent_id?: string | null;
  hasChildren?: boolean;
  consumption_data?: SmsConsumptionData;
  environmental_impact?: SmsEnvironmentalImpact;
  metadata?: SmsLocationNodeMetadata;
  /** RFC3339 timestamps for auditability. */
  created_at?: string;
  updated_at?: string;
}

export function toTreeNodeIdentity(node: SmsLocationNode): Pick<TreeNode, 'key' | 'label'> {
  return {
    key: node.location_id,
    label: node.name
  };
}

