/**
 * Seed catalog for offline fallback matching & dropdown labels until Org APIs expose hierarchy.
 * Mirrors Dynamo SK conventions used by api_lambda (branch/building/meter/asset IDs).
 */

export interface HierarchyDropdownOption {
  readonly label: string;
  readonly value: string;
}

export interface MeterCatalogRow {
  readonly meterId: string;
  readonly assetId: string;
  readonly buildingId: string;
  readonly branchId: string;
  readonly regionId: string;
  readonly costCenterId: string;
  readonly cupsCode?: string;
  readonly meterSerial?: string;
  readonly contractReference?: string;
  readonly holderTaxId?: string;
  readonly supplyAddressNorm?: string;
}

export const INVOICE_HIERARCHY_REGIONS: HierarchyDropdownOption[] = [
  { label: 'LatAm', value: 'reg-latam' },
  { label: 'EMEA', value: 'reg-emea' },
  { label: 'North America', value: 'reg-nam' }
];

export const INVOICE_HIERARCHY_BRANCHES: Array<HierarchyDropdownOption & { regionId: string }> = [
  { label: 'Argentina — Buenos Aires Hub', value: 'bra-arg-ba', regionId: 'reg-latam' },
  { label: 'Brazil — São Paulo Ops', value: 'bra-br-sp', regionId: 'reg-latam' },
  { label: 'Mexico — CDMX', value: 'bra-mx-cdmx', regionId: 'reg-latam' },
  { label: 'Spain — Madrid Iberia', value: 'bra-es-mad', regionId: 'reg-emea' },
  { label: 'Germany — Frankfurt', value: 'bra-de-fra', regionId: 'reg-emea' },
  { label: 'United States — Texas', value: 'bra-us-tx', regionId: 'reg-nam' }
];

export const INVOICE_HIERARCHY_BUILDINGS: Array<HierarchyDropdownOption & { branchId: string }> = [
  { label: 'Main Headquarters', value: 'bld-01', branchId: 'bra-arg-ba' },
  { label: 'Warehouse North', value: 'bld-02', branchId: 'bra-arg-ba' },
  { label: 'Manufacturing Plant', value: 'bld-03', branchId: 'bra-br-sp' },
  { label: 'CDMX Offices', value: 'bld-04', branchId: 'bra-mx-cdmx' },
  { label: 'Madrid Campus', value: 'bld-05', branchId: 'bra-es-mad' },
  { label: 'Frankfurt DC', value: 'bld-06', branchId: 'bra-de-fra' },
  { label: 'Houston Industrial', value: 'bld-07', branchId: 'bra-us-tx' }
];

/** Assets / meters — identifiers carry matching keys for fallback resolver */
export const INVOICE_METER_CATALOG: MeterCatalogRow[] = [
  {
    meterId: 'MTR-A1',
    assetId: 'AST-HQ-GRID',
    buildingId: 'bld-01',
    branchId: 'bra-arg-ba',
    regionId: 'reg-latam',
    costCenterId: 'cc-hq-ops',
    cupsCode: 'ES0021000004012345678FZ',
    meterSerial: 'SN-GRID-A1-7721',
    contractReference: '9988776655',
    holderTaxId: 'B87654321',
    supplyAddressNorm: 'calle mayor 10 madrid'
  },
  {
    meterId: 'MTR-HVAC-N',
    assetId: 'AST-WH-HVAC',
    buildingId: 'bld-02',
    branchId: 'bra-arg-ba',
    regionId: 'reg-latam',
    costCenterId: 'cc-log-wh',
    cupsCode: 'ES0031408123456789AB',
    meterSerial: 'SN-HVAC-N-4410'
  },
  {
    meterId: 'MTR-MAD-G',
    assetId: 'AST-MAD-GAS',
    buildingId: 'bld-05',
    branchId: 'bra-es-mad',
    regionId: 'reg-emea',
    costCenterId: 'cc-hq-ops',
    contractReference: 'CONT-MAD-009988'
  }
];

export const INVOICE_COST_CENTER_OPTIONS: Array<HierarchyDropdownOption & { buildingIds: readonly string[] }> =
  [
    { label: 'Corporate — HQ Operations', value: 'cc-hq-ops', buildingIds: ['bld-01', 'bld-05'] },
    { label: 'Logistics — Warehousing', value: 'cc-log-wh', buildingIds: ['bld-02', 'bld-07'] },
    { label: 'Manufacturing — Production', value: 'cc-mfg-prd', buildingIds: ['bld-03'] },
    { label: 'Regional Admin — Shared Services', value: 'cc-reg-adm', buildingIds: [] },
    { label: 'Data Center — Infrastructure', value: 'cc-dc-inf', buildingIds: ['bld-06'] },
    { label: 'Mexico — Branch Overhead', value: 'cc-mx-oh', buildingIds: ['bld-04'] }
  ];

export function assetOptionsForBuilding(buildingId: string): HierarchyDropdownOption[] {
  const rows = INVOICE_METER_CATALOG.filter((r) => r.buildingId === buildingId);
  const seen = new Set<string>();
  const out: HierarchyDropdownOption[] = [];
  for (const r of rows) {
    if (seen.has(r.assetId)) continue;
    seen.add(r.assetId);
    out.push({ label: `Asset ${r.assetId}`, value: r.assetId });
  }
  return out;
}

export function meterOptionsForAsset(assetId: string): HierarchyDropdownOption[] {
  return INVOICE_METER_CATALOG.filter((r) => r.assetId === assetId).map((r) => ({
    label: r.meterId,
    value: r.meterId
  }));
}
