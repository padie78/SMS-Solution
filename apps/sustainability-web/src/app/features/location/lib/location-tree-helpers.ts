import type { TreeNode } from 'primeng/api';
import type { SmsLocationNode, SmsLocationNodeMetadata, SmsLocationNodeType } from '../../../core/models/sms-location-node.model';
import { toTreeNodeIdentity } from '../../../core/models/sms-location-node.model';

const TYPE_ORDER: ReadonlyArray<SmsLocationNodeType> = [
  'ORGANIZATION',
  'REGION',
  'BRANCH',
  'BUILDING',
  'ASSET',
  'METER'
];

function typeRank(t: SmsLocationNodeType): number {
  return TYPE_ORDER.indexOf(t);
}

/** `tmp_*` = nodo insertado en el árbol antes del primer `saveNode` (no existe aún en AppSync/mockRows). */
export function isSmsTreeDraftNode(node: Pick<SmsLocationNode, 'location_id'>): boolean {
  const id = node.location_id;
  return typeof id === 'string' && id.startsWith('tmp_');
}

/** Quita flags solo de UI antes de enviar metadata a AppSync / mockRows. */
export function stripSmsLocalDraftFromMetadata(
  meta: SmsLocationNodeMetadata | undefined
): SmsLocationNodeMetadata {
  if (!meta || typeof meta !== 'object') return {};
  const next = { ...(meta as unknown as Record<string, unknown>) };
  delete next['smsLocalDraft'];
  return next as SmsLocationNodeMetadata;
}

export function canDrop(childType: SmsLocationNodeType, parentType: SmsLocationNodeType | null): boolean {
  const childRank = typeRank(childType);
  if (childRank < 0) return false;
  if (childType === 'ORGANIZATION') return parentType == null;
  if (childType === 'REGION') return parentType === 'ORGANIZATION';
  // CostCenter es transversal; no participa del árbol físico.
  if (childType === 'COST_CENTER') return false;
  if (parentType === 'COST_CENTER') return false;
  if (parentType == null) return false;
  const parentRank = typeRank(parentType);
  return parentRank === childRank - 1;
}

export function withPrimeTreeFields(node: SmsLocationNode, parent?: TreeNode): SmsLocationNode {
  const leaf = node.hasChildren === false;
  const children = node.children ?? (node.hasChildren ? undefined : []);
  return {
    ...node,
    ...toTreeNodeIdentity(node),
    data: node,
    leaf,
    children,
    parent
  };
}

export function sortNodes(nodes: SmsLocationNode[]): SmsLocationNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return String(a.type).localeCompare(String(b.type));
    return String(a.name).localeCompare(String(b.name));
  });
}

/** Nodo flat devuelto por `getTree` antes de aplicar hooks UI. */
export interface LocationGraphFlatDto {
  readonly id: string;
  readonly parentId?: string | null;
  readonly nodeType: SmsLocationNodeType;
  readonly name: string;
  readonly metadata?: unknown;
}

/**
 * Construye jerarquía PrimeNG desde lista plana (parentId → hijos).
 * Excluye `COST_CENTER` del árbol físico (mismo criterio que mock / HTTP anterior).
 */
export function hierarchicalSmsRootsFromFlatDtos(
  flat: ReadonlyArray<LocationGraphFlatDto>,
  parseMetadata: (meta: unknown) => SmsLocationNodeMetadata | undefined
): SmsLocationNode[] {
  const scoped = flat.filter((n) => n.nodeType !== 'COST_CENTER');
  const byId = new Map(scoped.map((n) => [n.id, n]));

  function sortPhysicalRows(rows: LocationGraphFlatDto[]): LocationGraphFlatDto[] {
    return [...rows].sort((a, b) => {
      if (a.nodeType !== b.nodeType) return String(a.nodeType).localeCompare(String(b.nodeType));
      return String(a.name).localeCompare(String(b.name));
    });
  }

  function assemble(row: LocationGraphFlatDto, parent?: TreeNode): SmsLocationNode {
    const childRows = sortPhysicalRows(scoped.filter((c) => (c.parentId ?? null) === row.id));

    const shell: SmsLocationNode = {
      location_id: row.id,
      parent_id: row.parentId ?? null,
      type: row.nodeType,
      name: row.name,
      status: 'ACTIVE',
      metadata: parseMetadata(row.metadata),
      hasChildren: childRows.length > 0,
      leaf: childRows.length === 0,
      children: []
    };

    const self = withPrimeTreeFields(shell, parent);
    const children = childRows.map((cRow) => assemble(cRow, self));
    self.children = children as SmsLocationNode[];
    self.leaf = children.length === 0;
    self.hasChildren = children.length > 0;
    const data = self.data as SmsLocationNode;
    if (data) {
      data.hasChildren = children.length > 0;
    }
    for (const ch of children) {
      ch.parent = self;
    }
    return self;
  }

  const orphanOrRoots = scoped.filter((n) => {
    const pid = n.parentId ?? null;
    if (pid == null) return true;
    return !byId.has(pid);
  });

  return sortPhysicalRows(orphanOrRoots).map((row) => assemble(row));
}


