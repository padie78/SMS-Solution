import type { TreeNode } from 'primeng/api';
import type { SmsLocationNode, SmsLocationNodeType } from '../../../../core/models/sms-location-node.model';

export interface LocationHierarchyContext {
  readonly organizationId?: string;
  readonly regionId?: string;
  readonly branchId?: string;
  readonly buildingId?: string;
  /** Para conveniencia en formularios de nivel hoja (Asset/Meter). */
  readonly nodeType?: SmsLocationNodeType;
  readonly nodeId?: string;
}

function isSmsLocationNode(value: unknown): value is SmsLocationNode {
  return typeof value === 'object' && value !== null && 'type' in (value as Record<string, unknown>) && 'location_id' in (value as Record<string, unknown>);
}

function nodeFromTreeNode(n: TreeNode | undefined | null): SmsLocationNode | null {
  if (!n) return null;
  const data = (n as SmsLocationNode).data;
  if (isSmsLocationNode(data)) return data;
  if (isSmsLocationNode(n)) return n;
  return null;
}

/**
 * Resuelve el contexto jerárquico caminando por `parent` (PrimeNG Tree).
 * Regla: el ID jerárquico es el `location_id` del nodo de ese tipo.
 */
export function resolveHierarchyContext(fromNode: SmsLocationNode | null | undefined): LocationHierarchyContext {
  const ctx: { organizationId?: string; regionId?: string; branchId?: string; buildingId?: string; nodeType?: SmsLocationNodeType; nodeId?: string } =
    {};
  const start = fromNode ?? null;
  if (!start) return ctx;
  ctx.nodeType = start.type;
  ctx.nodeId = start.location_id;

  let cur: TreeNode | undefined = start as unknown as TreeNode;
  for (let i = 0; i < 10 && cur; i += 1) {
    const n = nodeFromTreeNode(cur);
    if (n) {
      if (n.type === 'ORGANIZATION') ctx.organizationId ??= n.location_id;
      if (n.type === 'REGION') ctx.regionId ??= n.location_id;
      if (n.type === 'BRANCH') ctx.branchId ??= n.location_id;
      if (n.type === 'BUILDING') ctx.buildingId ??= n.location_id;
    }
    cur = cur.parent as TreeNode | undefined;
  }
  return ctx;
}

