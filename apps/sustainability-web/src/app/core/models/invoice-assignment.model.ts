/** Tier used when resolving which external identifier matched an asset/meter row */
export type AssetMatchTier =
  | 'cups'
  | 'meter_serial'
  | 'contract_reference'
  | 'holder_address'
  | 'none';

/** Canonical hierarchy IDs persisted with invoices */
export interface InvoiceHierarchySelection {
  regionId: string;
  branchId: string;
  buildingId: string;
  assetId: string;
  meterId: string;
  costCenterId: string;
}

export type HierarchyFieldKey = keyof InvoiceHierarchySelection;

/** Tracks how the current assignment was produced and UI affordances */
export interface InvoiceAssignmentMeta {
  source: 'ai_resolved' | 'user_manual' | 'none';
  matchTier: AssetMatchTier;
  /** Fields pre-filled by resolver / IA (visual BEM modifier) */
  aiDetectedFieldMask: Partial<Record<HierarchyFieldKey, boolean>>;
  /** When true, hierarchy dropdowns are read-only until user chooses "Edit" */
  hierarchyLocked: boolean;
  /** Call linkAssetExternalIdentifier before confirmInvoice (manual / corrected assignment) */
  requiresExternalIdentifierPersist: boolean;
}

export function emptyHierarchy(): InvoiceHierarchySelection {
  return {
    regionId: '',
    branchId: '',
    buildingId: '',
    assetId: '',
    meterId: '',
    costCenterId: ''
  };
}

export function emptyAssignmentMeta(): InvoiceAssignmentMeta {
  return {
    source: 'none',
    matchTier: 'none',
    aiDetectedFieldMask: {},
    hierarchyLocked: false,
    requiresExternalIdentifierPersist: false
  };
}
