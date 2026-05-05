import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import type { TreeNode } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import type { SmsLocationNode, SmsLocationNodeType } from '../../../core/models/sms-location-node.model';
import { toTreeNodeIdentity } from '../../../core/models/sms-location-node.model';

interface LocationsListResponse {
  items: SmsLocationNode[];
}

interface LocationCreateRequest {
  parent_id?: string | null;
  type: SmsLocationNodeType;
  name: string;
  status?: SmsLocationNode['status'];
  metadata?: SmsLocationNode['metadata'];
}

type LocationPatchRequest = Partial<Pick<SmsLocationNode, 'name' | 'status' | 'metadata' | 'consumption_data' | 'environmental_impact'>>;

interface ParentPatchRequest {
  parent_id: string | null;
}

const TYPE_ORDER: ReadonlyArray<SmsLocationNodeType> = [
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

function canDrop(childType: SmsLocationNodeType, parentType: SmsLocationNodeType | null): boolean {
  const childRank = typeRank(childType);
  if (childRank < 0) return false;
  if (childType === 'REGION') return parentType == null;
  if (parentType == null) return false;
  const parentRank = typeRank(parentType);
  return parentRank === childRank - 1;
}

function withPrimeTreeFields(node: SmsLocationNode, parent?: TreeNode): SmsLocationNode {
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

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);

  /**
   * Base URL for API Gateway endpoints.
   * Keep it relative by default so Angular proxy / same-origin deployments work.
   */
  private readonly baseUrl = '/locations';

  /**
   * Mock mode: run Location Manager without backend.
   * Flip to `false` when API Gateway endpoints are ready.
   */
  private readonly useMock = true;

  private readonly mockStorageKey = 'sms.location.manager.mock.v1';
  private mockRows: SmsLocationNode[] = [];

  readonly tree = signal<SmsLocationNode[]>([]);
  readonly selectedNode = signal<SmsLocationNode | null>(null);
  readonly loading = signal(false);
  readonly lastError = signal<string | null>(null);

  readonly breadcrumb = computed(() => {
    const node = this.selectedNode();
    if (!node) return [];
    const items: SmsLocationNode[] = [];
    let cur: TreeNode | undefined = node;
    while (cur) {
      const data = (cur as SmsLocationNode).data as SmsLocationNode | undefined;
      if (data) items.push(data);
      cur = cur.parent as TreeNode | undefined;
    }
    return items.reverse();
  });

  constructor() {
    this.loadMockFromStorage();
    effect(
      () => {
        // Ensure the selected node always points to the in-tree instance (parent refs).
        const sel = this.selectedNode();
        if (!sel?.location_id) return;
        const found = this.findNodeById(sel.location_id);
        if (found && found !== sel) {
          this.selectedNode.set(found);
        }
      },
      { allowSignalWrites: true }
    );
  }

  async loadRoots(): Promise<void> {
    this.loading.set(true);
    this.lastError.set(null);
    try {
      if (this.useMock) {
        const roots = this.mockRows
          .filter((n) => !n.parent_id)
          .map((n) => this.withMockComputedChildren(withPrimeTreeFields(n)));
        this.tree.set(this.sortNodes(roots));
      } else {
        const resp = await firstValueFrom(this.http.get<LocationsListResponse>(`${this.baseUrl}/root`));
        const roots = (resp.items ?? []).map((n) => withPrimeTreeFields(n));
        this.tree.set(roots);
      }
    } catch (e: unknown) {
      this.lastError.set(this.describeHttpError('Failed to load roots', e));
    } finally {
      this.loading.set(false);
    }
  }

  async ensureChildrenLoaded(parent: SmsLocationNode): Promise<void> {
    const alreadyLoaded = Array.isArray(parent.children) && parent.children.length > 0;
    if (alreadyLoaded) return;
    if (parent.hasChildren === false) {
      parent.children = [];
      return;
    }
    this.lastError.set(null);
    try {
      if (this.useMock) {
        const children = this.mockRows
          .filter((n) => (n.parent_id ?? null) === parent.location_id)
          .map((n) => this.withMockComputedChildren(withPrimeTreeFields(n, parent)));
        parent.children = this.sortNodes(children);
        parent.leaf = (parent.children ?? []).length === 0;
      } else {
        const resp = await firstValueFrom(
          this.http.get<LocationsListResponse>(`${this.baseUrl}/${encodeURIComponent(parent.location_id)}/children`)
        );
        const children = (resp.items ?? []).map((n) => withPrimeTreeFields(n, parent));
        parent.children = children;
        parent.leaf = children.length === 0;
      }
    } catch (e: unknown) {
      this.lastError.set(this.describeHttpError('Failed to load children', e));
    }
  }

  async createNodeOptimistic(request: LocationCreateRequest): Promise<SmsLocationNode> {
    this.lastError.set(null);
    const tmpId = `tmp_${crypto.randomUUID?.() ?? Math.random().toString(16).slice(2)}`;
    const optimistic: SmsLocationNode = withPrimeTreeFields(
      {
        location_id: tmpId,
        parent_id: request.parent_id ?? null,
        type: request.type,
        name: request.name,
        status: request.status ?? 'ACTIVE',
        metadata: request.metadata ?? {},
        hasChildren: false
      } as SmsLocationNode
    );

    this.insertOptimistic(optimistic);

    try {
      if (this.useMock) {
        const created: SmsLocationNode = {
          location_id: `loc_${crypto.randomUUID?.() ?? Math.random().toString(16).slice(2)}`,
          parent_id: request.parent_id ?? null,
          type: request.type,
          name: request.name,
          status: request.status ?? 'ACTIVE',
          metadata: request.metadata ?? {},
          hasChildren: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as SmsLocationNode;
        this.mockRows = [...this.mockRows, created];
        this.persistMock();

        const createdNode = this.withMockComputedChildren(withPrimeTreeFields(created));
        this.replaceNodeId(tmpId, createdNode);
        return createdNode;
      } else {
        const created = await firstValueFrom(this.http.post<SmsLocationNode>(`${this.baseUrl}`, request));
        const createdNode = withPrimeTreeFields(created);
        this.replaceNodeId(tmpId, createdNode);
        return createdNode;
      }
    } catch (e: unknown) {
      this.removeNodeById(tmpId);
      const msg = this.describeHttpError('Failed to create node', e);
      this.lastError.set(msg);
      throw new Error(msg);
    }
  }

  async updateNode(id: string, patch: LocationPatchRequest): Promise<SmsLocationNode> {
    this.lastError.set(null);
    const target = this.findNodeById(id);
    const prev = target ? structuredClone(target.data as SmsLocationNode) : null;
    if (target) {
      Object.assign(target, withPrimeTreeFields({ ...(target.data as SmsLocationNode), ...patch, location_id: id } as SmsLocationNode, target.parent as TreeNode));
      // refresh label if name changed
      if (patch.name != null) target.label = patch.name;
      (target.data as SmsLocationNode).name = patch.name ?? (target.data as SmsLocationNode).name;
    }
    try {
      if (this.useMock) {
        const idx = this.mockRows.findIndex((r) => r.location_id === id);
        if (idx < 0) throw new Error('Node not found');
        const cur = this.mockRows[idx];
        const updated: SmsLocationNode = {
          ...cur,
          ...patch,
          location_id: id,
          updated_at: new Date().toISOString()
        } as SmsLocationNode;
        this.mockRows = [...this.mockRows.slice(0, idx), updated, ...this.mockRows.slice(idx + 1)];
        this.persistMock();
        const updatedNode = this.withMockComputedChildren(withPrimeTreeFields(updated, target?.parent as TreeNode | undefined));
        this.replaceNodeId(id, updatedNode);
        return updatedNode;
      } else {
        const updated = await firstValueFrom(
          this.http.patch<SmsLocationNode>(`${this.baseUrl}/${encodeURIComponent(id)}`, patch)
        );
        const updatedNode = withPrimeTreeFields(updated, target?.parent as TreeNode | undefined);
        this.replaceNodeId(id, updatedNode);
        return updatedNode;
      }
    } catch (e: unknown) {
      if (target && prev) {
        Object.assign(target, withPrimeTreeFields(prev, target.parent as TreeNode));
      }
      const msg = this.describeHttpError('Failed to update node', e);
      this.lastError.set(msg);
      throw new Error(msg);
    }
  }

  async updateParent(nodeId: string, newParentId: string | null): Promise<void> {
    this.lastError.set(null);
    const node = this.findNodeById(nodeId);
    const newParent = newParentId ? this.findNodeById(newParentId) : null;
    const nodeType = (node?.data as SmsLocationNode | undefined)?.type;
    const parentType = (newParent?.data as SmsLocationNode | undefined)?.type ?? null;
    if (!node || !nodeType) throw new Error('Node not found');
    if (!canDrop(nodeType, parentType)) throw new Error('Invalid hierarchy drop');

    // optimistic move
    const previousParent = node.parent as SmsLocationNode | undefined;
    this.detachFromParent(node);
    if (newParent) {
      newParent.children = [...(newParent.children ?? []), node];
      node.parent = newParent;
      node.data = { ...(node.data as SmsLocationNode), parent_id: newParent.location_id };
      (node.data as SmsLocationNode).parent_id = newParent.location_id;
      newParent.leaf = false;
      newParent.hasChildren = true;
      newParent.expanded = true;
    } else {
      node.parent = undefined;
      node.data = { ...(node.data as SmsLocationNode), parent_id: null };
      (node.data as SmsLocationNode).parent_id = null;
      this.tree.set([...this.tree(), node]);
    }

    try {
      if (this.useMock) {
        const idx = this.mockRows.findIndex((r) => r.location_id === nodeId);
        if (idx < 0) throw new Error('Node not found');
        const cur = this.mockRows[idx];
        const updated: SmsLocationNode = {
          ...cur,
          parent_id: newParentId,
          updated_at: new Date().toISOString()
        } as SmsLocationNode;
        this.mockRows = [...this.mockRows.slice(0, idx), updated, ...this.mockRows.slice(idx + 1)];
        this.persistMock();
      } else {
        await firstValueFrom(
          this.http.patch<void>(`${this.baseUrl}/${encodeURIComponent(nodeId)}/parent`, {
            parent_id: newParentId
          } satisfies ParentPatchRequest)
        );
      }
    } catch (e: unknown) {
      // revert
      this.detachFromParent(node);
      if (previousParent) {
        previousParent.children = [...(previousParent.children ?? []), node];
        node.parent = previousParent;
        (node.data as SmsLocationNode).parent_id = previousParent.location_id;
        previousParent.leaf = false;
        previousParent.hasChildren = true;
      } else {
        node.parent = undefined;
        (node.data as SmsLocationNode).parent_id = null;
        this.tree.set([...this.tree(), node]);
      }
      const msg = this.describeHttpError('Failed to move node', e);
      this.lastError.set(msg);
      throw new Error(msg);
    }
  }

  async deleteNode(id: string): Promise<void> {
    this.lastError.set(null);
    const node = this.findNodeById(id);
    if (!node) return;
    const snapshot = this.snapshotSubtree(node);
    this.removeNodeById(id);
    try {
      if (this.useMock) {
        const ids = this.collectSubtreeIds(id);
        this.mockRows = this.mockRows.filter((r) => !ids.has(r.location_id));
        this.persistMock();
      } else {
        await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`));
      }
      if (this.selectedNode()?.location_id === id) this.selectedNode.set(null);
    } catch (e: unknown) {
      this.restoreSnapshot(snapshot);
      const msg = this.describeHttpError('Failed to delete node', e);
      this.lastError.set(msg);
      throw new Error(msg);
    }
  }

  private withMockComputedChildren(node: SmsLocationNode): SmsLocationNode {
    const hasChildren = this.mockRows.some((r) => (r.parent_id ?? null) === node.location_id);
    return {
      ...node,
      hasChildren,
      leaf: !hasChildren
    };
  }

  private sortNodes(nodes: SmsLocationNode[]): SmsLocationNode[] {
    return [...nodes].sort((a, b) => {
      if (a.type !== b.type) return String(a.type).localeCompare(String(b.type));
      return String(a.name).localeCompare(String(b.name));
    });
  }

  private collectSubtreeIds(rootId: string): Set<string> {
    const ids = new Set<string>();
    const visit = (id: string) => {
      ids.add(id);
      for (const child of this.mockRows.filter((r) => (r.parent_id ?? null) === id)) {
        if (!ids.has(child.location_id)) visit(child.location_id);
      }
    };
    visit(rootId);
    return ids;
  }

  private loadMockFromStorage(): void {
    if (!this.useMock) return;
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(this.mockStorageKey) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      this.mockRows = parsed as SmsLocationNode[];
    } catch {
      // ignore
    }
  }

  private persistMock(): void {
    if (!this.useMock) return;
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(this.mockStorageKey, JSON.stringify(this.mockRows));
    } catch {
      // ignore
    }
  }

  private describeHttpError(prefix: string, err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return `${prefix}${err instanceof Error && err.message ? `: ${err.message}` : ''}`;
    }
    const status = err.status ? `${err.status} ${err.statusText || ''}`.trim() : 'Network/CORS';
    const url = err.url ? ` · ${err.url}` : '';
    const body =
      err.error == null
        ? ''
        : typeof err.error === 'string'
          ? ` · ${err.error}`
          : typeof err.error === 'object'
            ? ` · ${JSON.stringify(err.error)}`
            : '';
    return `${prefix}: ${status}${url}${body}`;
  }

  validateDrop(dragNode: SmsLocationNode, dropNode: SmsLocationNode | null): { ok: boolean; reason?: string } {
    const childType = (dragNode.data as SmsLocationNode | undefined)?.type ?? dragNode.type;
    const parentType = dropNode ? ((dropNode.data as SmsLocationNode | undefined)?.type ?? dropNode.type) : null;
    if (!canDrop(childType, parentType)) {
      return { ok: false, reason: 'Jerarquía inválida para este movimiento.' };
    }
    // prevent cycles
    if (dropNode && this.isAncestor(dragNode, dropNode)) {
      return { ok: false, reason: 'No se puede mover un nodo dentro de su propio sub-árbol.' };
    }
    return { ok: true };
  }

  private findNodeById(id: string): SmsLocationNode | null {
    const walk = (nodes: SmsLocationNode[]): SmsLocationNode | null => {
      for (const n of nodes) {
        if (n.location_id === id || n.key === id) return n;
        const children = (n.children ?? []) as SmsLocationNode[];
        const found = walk(children);
        if (found) return found;
      }
      return null;
    };
    return walk(this.tree());
  }

  private insertOptimistic(node: SmsLocationNode): void {
    const pid = node.parent_id ?? null;
    if (!pid) {
      this.tree.set([...this.tree(), node]);
      return;
    }
    const parent = this.findNodeById(pid);
    if (!parent) {
      this.tree.set([...this.tree(), node]);
      return;
    }
    node.parent = parent;
    parent.children = [...(parent.children ?? []), node];
    parent.leaf = false;
    parent.hasChildren = true;
    parent.expanded = true;
  }

  private replaceNodeId(oldId: string, replacement: SmsLocationNode): void {
    const node = this.findNodeById(oldId);
    if (!node) return;
    const parent = node.parent as SmsLocationNode | undefined;
    replacement.parent = parent;
    if (!parent) {
      const roots = this.tree().map((n) => (n.location_id === oldId ? replacement : n));
      this.tree.set(roots);
      if (this.selectedNode()?.location_id === oldId) this.selectedNode.set(replacement);
      return;
    }
    parent.children = (parent.children ?? []).map((c) => ((c as SmsLocationNode).location_id === oldId ? replacement : c)) as SmsLocationNode[];
    if (this.selectedNode()?.location_id === oldId) this.selectedNode.set(replacement);
  }

  private removeNodeById(id: string): void {
    const node = this.findNodeById(id);
    if (!node) return;
    this.detachFromParent(node);
  }

  private detachFromParent(node: SmsLocationNode): void {
    const parent = node.parent as SmsLocationNode | undefined;
    if (parent) {
      parent.children = (parent.children ?? []).filter((c) => (c as SmsLocationNode).location_id !== node.location_id) as SmsLocationNode[];
      if ((parent.children ?? []).length === 0) {
        parent.leaf = parent.hasChildren === false;
      }
      return;
    }
    this.tree.set(this.tree().filter((n) => n.location_id !== node.location_id));
  }

  private isAncestor(ancestor: SmsLocationNode, node: SmsLocationNode): boolean {
    let cur: TreeNode | undefined = node.parent as TreeNode | undefined;
    while (cur) {
      if ((cur as SmsLocationNode).location_id === ancestor.location_id) return true;
      cur = cur.parent as TreeNode | undefined;
    }
    return false;
  }

  private snapshotSubtree(node: SmsLocationNode): { parentId: string | null; node: SmsLocationNode } {
    const parentId = (node.parent as SmsLocationNode | undefined)?.location_id ?? null;
    const clone = structuredClone(node.data as SmsLocationNode) as SmsLocationNode;
    // children snapshot is shallow: enough to restore at same place visually after failure.
    clone.children = node.children as SmsLocationNode[] | undefined;
    return { parentId, node: clone };
  }

  private restoreSnapshot(snapshot: { parentId: string | null; node: SmsLocationNode }): void {
    const restored = withPrimeTreeFields(snapshot.node);
    if (!snapshot.parentId) {
      this.tree.set([...this.tree(), restored]);
      return;
    }
    const parent = this.findNodeById(snapshot.parentId);
    if (!parent) {
      this.tree.set([...this.tree(), restored]);
      return;
    }
    restored.parent = parent;
    parent.children = [...(parent.children ?? []), restored];
    parent.leaf = false;
    parent.hasChildren = true;
  }
}

