import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import type { TreeNode } from 'primeng/api';
import { Subscription, firstValueFrom } from 'rxjs';
import type { SmsLocationNode, SmsLocationNodeType } from '../../../core/models/sms-location-node.model';
import { LOCATION_API_BASE_URL, LOCATION_MOCK_STORAGE_KEY, LOCATION_USE_MOCK } from '../data/location.mock';
import type { GraphqlNodeDto } from './location-api.models';
import { LocationNodeAppSyncService } from './location-node-appsync.service';
import {
  canDrop,
  hierarchicalSmsRootsFromFlatDtos,
  sortNodes,
  withPrimeTreeFields
} from '../lib/location-tree-helpers';

function nextId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}_${uuid ?? Math.random().toString(16).slice(2)}`;
}

/** Valor estable que el resolver GraphQL debe aceptar como raíz lógica. */
const GRAPHQL_ROOT_PARENT_ID = 'ROOT';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);
  private readonly nodeApi = inject(LocationNodeAppSyncService);
  private readonly destroyRef = inject(DestroyRef);

  private mockRows: SmsLocationNode[] = [];

  /** Caché plana desde `getTree` (solo modo AppSync). */
  readonly remoteFlat = signal(new Map<string, GraphqlNodeDto>());

  private nodeChangesSub?: Subscription;

  readonly tree = signal<SmsLocationNode[]>([]);
  readonly selectedNode = signal<SmsLocationNode | null>(null);
  readonly loading = signal(false);
  readonly lastError = signal<string | null>(null);

  private touchTree(): void {
    // PrimeNG Tree + OnPush: algunas mutaciones in-place no disparan re-render.
    // Esta copia superficial fuerza detección sin reconstruir el sub-árbol.
    this.tree.set([...this.tree()]);
  }

  private collectExpandedIds(): Set<string> {
    const out = new Set<string>();
    const walk = (nodes: SmsLocationNode[]) => {
      for (const n of nodes) {
        if (n.expanded && n.location_id) out.add(n.location_id);
        const children = (n.children ?? []) as SmsLocationNode[];
        if (children.length) walk(children);
      }
    };
    walk(this.tree());
    return out;
  }

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
    this.destroyRef.onDestroy(() => this.nodeChangesSub?.unsubscribe());
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

  /**
   * Escucha cambios desde `saveNode` / `updateNode` / `deleteNode` (App Sync).
   * Invocar una vez después de Amplify configurado y usuario autenticado.
   */
  connectNodeChangeSubscription(): void {
    if (LOCATION_USE_MOCK || this.nodeChangesSub) return;
    this.nodeChangesSub = this.nodeApi.onNodeChanges().subscribe({
      next: async () => {
        try {
          await this.softReloadRemoteTree();
        } catch (err: unknown) {
          this.lastError.set(this.describeGraphOrHttpError('Actualización automática jerarquía', err));
        }
      },
      error: (err: unknown) => {
        this.lastError.set(this.describeGraphOrHttpError('Suscripción onNodeChanged', err));
      }
    });
  }

  private mergeIntoRemoteIndex(rows: GraphqlNodeDto[], replaceAll: boolean): void {
    const next = replaceAll ? new Map<string, GraphqlNodeDto>() : new Map(this.remoteFlat());
    for (const r of rows) {
      next.set(r.id, r);
    }
    this.remoteFlat.set(next);
  }

  private materializeTreeFromRemoteIndex(): void {
    const list = [...this.remoteFlat().values()];
    const roots = hierarchicalSmsRootsFromFlatDtos(list, (meta) =>
      this.nodeApi.parseMetadata(meta as GraphqlNodeDto['metadata'])
    );
    const sortedRoots = sortNodes(roots);
    this.tree.set(sortedRoots);
    this.touchTree();
  }

  /** Refetch completo respetando expansiones conocidas actualmente en UI. */
  private async softReloadRemoteTree(): Promise<void> {
    const expandedBefore = this.collectExpandedIds();
    try {
      const rows = await this.nodeApi.getTree(null);
      this.mergeIntoRemoteIndex(rows, true);
      this.materializeTreeFromRemoteIndex();
      await this.expandRestoredBranches(expandedBefore);
    } finally {
      this.touchTree();
    }
  }

  private async expandRestoredBranches(expandedBefore: ReadonlySet<string>): Promise<void> {
    const orgRoots = this.tree().filter((n) => n.type === 'ORGANIZATION');
    for (const org of orgRoots) {
      org.expanded = true;
      await this.ensureChildrenLoaded(org);
    }
    const pending = new Set(expandedBefore);
    for (let i = 0; i < 8 && pending.size > 0; i += 1) {
      let progressed = false;
      for (const id of Array.from(pending)) {
        const node = this.findNodeById(id);
        if (!node) continue;
        node.expanded = true;
        await this.ensureChildrenLoaded(node);
        pending.delete(id);
        progressed = true;
      }
      if (!progressed) break;
    }
  }

  async loadRoots(): Promise<void> {
    const expandedBefore = this.collectExpandedIds();
    this.loading.set(true);
    this.lastError.set(null);
    try {
      if (LOCATION_USE_MOCK) {
        this.normalizeMockPhysicalHierarchy();
        const roots = this.mockRows
          .filter((n) => !n.parent_id && n.type !== 'COST_CENTER')
          .map((n) => this.withMockComputedChildren(withPrimeTreeFields(n)));
        this.tree.set(sortNodes(roots));
      } else {
        const rows = await this.nodeApi.getTree(null);
        this.mergeIntoRemoteIndex(rows, true);
        this.materializeTreeFromRemoteIndex();
      }

      const orgRoots = this.tree().filter((n) => n.type === 'ORGANIZATION');
      for (const org of orgRoots) {
        org.expanded = true;
        await this.ensureChildrenLoaded(org);
      }

      if (LOCATION_USE_MOCK) {
        for (const org of orgRoots) {
          await this.preloadDescendants(org, 8);
        }
      }

      await this.expandRestoredBranches(expandedBefore);
    } catch (e: unknown) {
      this.lastError.set(
        LOCATION_USE_MOCK
          ? this.describeHttpError('Failed to load roots', e)
          : this.describeGraphOrHttpError('No se pudo cargar la jerarquía', e)
      );
    } finally {
      this.loading.set(false);
      if (!LOCATION_USE_MOCK) {
        this.connectNodeChangeSubscription();
      }
    }
  }

  private async preloadDescendants(root: SmsLocationNode, maxDepth: number): Promise<void> {
    if (maxDepth <= 0) return;
    root.expanded = true;
    await this.ensureChildrenLoaded(root);
    const children = (root.children ?? []) as SmsLocationNode[];
    for (const child of children) {
      await this.preloadDescendants(child, maxDepth - 1);
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
      if (LOCATION_USE_MOCK) {
        const children = this.mockRows
          .filter((n) => (n.parent_id ?? null) === parent.location_id)
          .filter((n) => n.type !== 'COST_CENTER')
          .map((n) => this.withMockComputedChildren(withPrimeTreeFields(n, parent)));
        parent.children = sortNodes(children);
        parent.leaf = (parent.children ?? []).length === 0;
        this.touchTree();
      } else {
        const expandedBefore = this.collectExpandedIds();
        expandedBefore.add(parent.location_id);
        const subtree = await this.nodeApi.getTree(parent.location_id);
        this.mergeIntoRemoteIndex(subtree, false);
        this.materializeTreeFromRemoteIndex();
        await this.expandRestoredBranches(expandedBefore);

        const fresh = this.findNodeById(parent.location_id);
        if (fresh) {
          fresh.expanded = true;
        }
      }
    } catch (e: unknown) {
      this.lastError.set(
        LOCATION_USE_MOCK
          ? this.describeHttpError('Failed to load children', e)
          : this.describeGraphOrHttpError('No se pudieron cargar los hijos', e)
      );
    }
  }

  async createNodeOptimistic(request: {
    readonly parent_id?: string | null;
    readonly type: SmsLocationNodeType;
    readonly name: string;
    readonly status?: SmsLocationNode['status'];
    readonly metadata?: SmsLocationNode['metadata'];
  }): Promise<SmsLocationNode> {
    this.lastError.set(null);
    const tmpId = nextId('tmp');
    const optimistic: SmsLocationNode = withPrimeTreeFields({
      location_id: tmpId,
      parent_id: request.parent_id ?? null,
      type: request.type,
      name: request.name,
      status: request.status ?? 'ACTIVE',
      metadata: request.metadata ?? {},
      hasChildren: false
    } as SmsLocationNode);

    this.insertOptimistic(optimistic);

    try {
      if (LOCATION_USE_MOCK) {
        const created: SmsLocationNode = {
          location_id: nextId('loc'),
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
      }

      const mutation = await this.nodeApi.saveNode({
        parentId: request.parent_id ?? GRAPHQL_ROOT_PARENT_ID,
        nodeType: request.type,
        name: request.name,
        metadata: LocationNodeAppSyncService.metadataToAwsJson(
          request.metadata ? { ...(request.metadata as unknown as Record<string, unknown>) } : {}
        )
      });
      this.nodeApi.assertSuccess(mutation, 'saveNode');
      await this.softReloadRemoteTree();

      let createdNode = mutation.id ? this.findNodeById(mutation.id) : null;
      if (!createdNode) {
        const wantNorm =
          !request.parent_id || request.parent_id === GRAPHQL_ROOT_PARENT_ID
            ? GRAPHQL_ROOT_PARENT_ID
            : String(request.parent_id);
        const guessed = [...this.remoteFlat().values()].find((n) => {
          const nParentNorm =
            !n.parentId || n.parentId === GRAPHQL_ROOT_PARENT_ID ? GRAPHQL_ROOT_PARENT_ID : String(n.parentId);
          return n.nodeType === request.type && n.name === request.name && nParentNorm === wantNorm;
        });
        createdNode = guessed ? this.findNodeById(guessed.id) : null;
      }

      if (!createdNode) {
        throw new Error(mutation.message || 'Guardado ejecutado pero el nodo no apareció tras refrescar desde AppSync.');
      }
      void this.replaceNodeId(tmpId, createdNode);

      return createdNode;
    } catch (e: unknown) {
      this.removeNodeById(tmpId);
      const msg = LOCATION_USE_MOCK
        ? this.describeHttpError('Failed to create node', e)
        : this.describeGraphOrHttpError('No se pudo crear el nodo', e);
      this.lastError.set(msg);
      throw new Error(msg);
    }
  }

  async updateNode(
    id: string,
    patch: Partial<
      Pick<SmsLocationNode, 'name' | 'status' | 'metadata' | 'consumption_data' | 'environmental_impact'>
    >
  ): Promise<SmsLocationNode> {
    this.lastError.set(null);
    const target = this.findNodeById(id);
    const prev = target ? structuredClone(target.data as SmsLocationNode) : null;
    if (target) {
      Object.assign(
        target,
        withPrimeTreeFields(
          { ...(target.data as SmsLocationNode), ...patch, location_id: id } as SmsLocationNode,
          target.parent as TreeNode
        )
      );
      if (patch.name != null) target.label = patch.name;
      (target.data as SmsLocationNode).name = patch.name ?? (target.data as SmsLocationNode).name;
      this.touchTree();
    }

    try {
      if (LOCATION_USE_MOCK) {
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
        const updatedNode = this.withMockComputedChildren(
          withPrimeTreeFields(updated, target?.parent as TreeNode | undefined)
        );
        this.replaceNodeId(id, updatedNode);
        this.touchTree();
        return updatedNode;
      }

      if (!target || !prev) {
        throw new Error('updateNode sin nodo en memoria');
      }

      const gqlInput: { name?: string | null; metadata?: string | null } = {};
      if (patch.name !== undefined) gqlInput.name = patch.name;
      const metaRecord: Record<string, unknown> = {
        ...(((prev as SmsLocationNode).metadata ?? {}) as unknown as Record<string, unknown>)
      };
      if (patch.metadata !== undefined) Object.assign(metaRecord, patch.metadata as Record<string, unknown>);
      if (patch.status !== undefined) metaRecord['operationalStatus'] = patch.status;
      if (patch.consumption_data !== undefined) metaRecord['consumption_data'] = patch.consumption_data;
      if (patch.environmental_impact !== undefined) metaRecord['environmental_impact'] = patch.environmental_impact;
      if (
        patch.metadata !== undefined ||
        patch.status !== undefined ||
        patch.consumption_data !== undefined ||
        patch.environmental_impact !== undefined
      ) {
        gqlInput.metadata = LocationNodeAppSyncService.metadataToAwsJson(metaRecord);
      }

      const hasPayload = gqlInput.name !== undefined || gqlInput.metadata !== undefined;
      if (!hasPayload) {
        return target as SmsLocationNode;
      }

      const mutation = await this.nodeApi.updateNode(id, gqlInput);
      this.nodeApi.assertSuccess(mutation, 'updateNode');
      await this.softReloadRemoteTree();

      const updatedNode = this.findNodeById(id);
      if (!updatedNode) {
        throw new Error(mutation.message || 'Actualización ejecutada pero el nodo desapareció del árbol.');
      }

      void this.replaceNodeId(id, updatedNode);

      return updatedNode;
    } catch (e: unknown) {
      if (target && prev) {
        Object.assign(target, withPrimeTreeFields(prev, target.parent as TreeNode));
        this.touchTree();
      }
      const msg = LOCATION_USE_MOCK
        ? this.describeHttpError('Failed to update node', e)
        : this.describeGraphOrHttpError('No se pudo actualizar el nodo', e);
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
      if (LOCATION_USE_MOCK) {
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
        const sms = node.data as SmsLocationNode;
        const mutation = await this.nodeApi.saveNode({
          id: sms.location_id,
          parentId: newParentId ?? GRAPHQL_ROOT_PARENT_ID,
          nodeType: sms.type,
          name: sms.name,
          metadata: LocationNodeAppSyncService.metadataToAwsJson(
            (sms.metadata ?? {}) as unknown as Record<string, unknown>
          )
        });
        this.nodeApi.assertSuccess(mutation, 'reparent-saveNode');
        await this.softReloadRemoteTree();

        const reparented = this.findNodeById(nodeId);
        if (!reparented) throw new Error('Reubicación ejecutada pero el nodo no está en árbol actualizado.');
      }
    } catch (e: unknown) {
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
      const msg = LOCATION_USE_MOCK
        ? this.describeHttpError('Failed to move node', e)
        : this.describeGraphOrHttpError('No se pudo mover el nodo', e);
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
      if (LOCATION_USE_MOCK) {
        const ids = this.collectSubtreeIds(id);
        this.mockRows = this.mockRows.filter((r) => !ids.has(r.location_id));
        this.persistMock();
      } else {
        const mutation = await this.nodeApi.deleteNode(id);
        this.nodeApi.assertSuccess(mutation, 'deleteNode');
        await this.softReloadRemoteTree();
      }
      if (this.selectedNode()?.location_id === id) this.selectedNode.set(null);
    } catch (e: unknown) {
      this.restoreSnapshot(snapshot);
      const msg = LOCATION_USE_MOCK
        ? this.describeHttpError('Failed to delete node', e)
        : this.describeGraphOrHttpError('No se pudo eliminar el nodo', e);
      this.lastError.set(msg);
      throw new Error(msg);
    }
  }

  /**
   * Determina si un nodo tiene hijos directos.
   * - Mock mode: usa `mockRows` (source of truth localStorage).
   * - Backend mode: asegura carga lazy y revisa `children`.
   */
  async hasDirectChildren(node: SmsLocationNode): Promise<boolean> {
    if (LOCATION_USE_MOCK) {
      return this.mockRows.some((r) => (r.parent_id ?? null) === node.location_id && r.type !== 'COST_CENTER');
    }
    await this.ensureChildrenLoaded(node);
    return Array.isArray(node.children) && node.children.length > 0;
  }

  validateDrop(dragNode: SmsLocationNode, dropNode: SmsLocationNode | null): { ok: boolean; reason?: string } {
    const childType = (dragNode.data as SmsLocationNode | undefined)?.type ?? dragNode.type;
    const parentType = dropNode ? ((dropNode.data as SmsLocationNode | undefined)?.type ?? dropNode.type) : null;
    if (!canDrop(childType, parentType)) {
      return { ok: false, reason: 'Jerarquía inválida para este movimiento.' };
    }
    if (dropNode && this.isAncestor(dragNode, dropNode)) {
      return { ok: false, reason: 'No se puede mover un nodo dentro de su propio sub-árbol.' };
    }
    return { ok: true };
  }

  private withMockComputedChildren(node: SmsLocationNode): SmsLocationNode {
    const hasChildren = this.mockRows.some(
      (r) => (r.parent_id ?? null) === node.location_id && r.type !== 'COST_CENTER'
    );
    return {
      ...node,
      hasChildren,
      leaf: !hasChildren
    };
  }

  /**
   * Cost Center es transversal y no cuelga del árbol físico.
   * En mock mode, migramos cualquier Asset que hoy cuelgue de un COST_CENTER
   * para que cuelgue del BUILDING padre del Cost Center.
   */
  private normalizeMockPhysicalHierarchy(): void {
    const costCenters = this.mockRows.filter((n) => n.type === 'COST_CENTER');
    if (costCenters.length === 0) return;

    const byId = new Map<string, SmsLocationNode>();
    for (const n of this.mockRows) byId.set(n.location_id, n);

    const ccToPhysicalParent = new Map<string, string | null>();
    for (const cc of costCenters) {
      const parentId = cc.parent_id ?? null;
      const parent = parentId ? byId.get(parentId) : undefined;
      // Solo migramos hacia un padre físico válido (idealmente BUILDING).
      // Si no existe, dejamos la relación como está (para no "perder" nodos).
      if (parent && (parent.type === 'BUILDING' || parent.type === 'BRANCH')) {
        ccToPhysicalParent.set(cc.location_id, parentId);
      }
    }

    let changed = false;
    this.mockRows = this.mockRows.map((n) => {
      const currentParentId = n.parent_id ?? null;
      if (!currentParentId) return n;
      const newParent = ccToPhysicalParent.get(currentParentId);
      if (newParent === undefined) return n;
      if (newParent === currentParentId) return n;
      // Mueve el nodo que cuelga del CC al padre físico del CC.
      changed = true;
      return { ...n, parent_id: newParent };
    });

    if (changed) this.persistMock();
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
    if (!LOCATION_USE_MOCK) return;
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LOCATION_MOCK_STORAGE_KEY) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      this.mockRows = parsed as SmsLocationNode[];
    } catch {
      // ignore
    }
  }

  private persistMock(): void {
    if (!LOCATION_USE_MOCK) return;
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(LOCATION_MOCK_STORAGE_KEY, JSON.stringify(this.mockRows));
    } catch {
      // ignore
    }
  }

  private describeGraphOrHttpError(prefix: string, err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      return this.describeHttpError(prefix, err);
    }
    if (typeof err === 'object' && err !== null && 'errors' in err) {
      const gql = err as { errors?: ReadonlyArray<{ message?: string }> };
      const first = gql.errors?.[0]?.message;
      if (first) return `${prefix}: ${first}`;
    }
    if (err instanceof Error) return `${prefix}: ${err.message}`;
    return `${prefix}: respuesta inválida`;
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
    parent.children = (parent.children ?? []).map((c) =>
      (c as SmsLocationNode).location_id === oldId ? replacement : c
    ) as SmsLocationNode[];
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
      parent.children = (parent.children ?? []).filter(
        (c) => (c as SmsLocationNode).location_id !== node.location_id
      ) as SmsLocationNode[];
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

