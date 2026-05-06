import type { TreeNode } from 'primeng/api';
import type { SmsLocationNode, SmsLocationNodeType } from '../../../core/models/sms-location-node.model';
import { toTreeNodeIdentity } from '../../../core/models/sms-location-node.model';

const TYPE_ORDER: ReadonlyArray<SmsLocationNodeType> = [
  'ORGANIZATION',
  'REGION',
  'BRANCH',
  'BUILDING',
  'COST_CENTER',
  'ASSET',
  'METER'
];

function typeRank(t: SmsLocationNodeType): number {
  return TYPE_ORDER.indexOf(t);
}

export function canDrop(childType: SmsLocationNodeType, parentType: SmsLocationNodeType | null): boolean {
  const childRank = typeRank(childType);
  if (childRank < 0) return false;
  if (childType === 'ORGANIZATION') return parentType == null;
  if (childType === 'REGION') return parentType === 'ORGANIZATION';
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

