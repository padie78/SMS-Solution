import { Injectable, inject, isDevMode } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { Observable, filter, map } from 'rxjs';
import { AuthService } from '../../../services/infrastructure/auth.service';
import type {
  GraphqlNodeDto,
  LocationMutationResponse,
  SaveNodeGraphqlInput,
  UpdateNodeGraphqlInput
} from './location-api.models';

type QueryResult<T> = { data?: T };

const GET_TREE = /* GraphQL */ `
  query GetTree($rootNodeId: ID, $orgId: ID) {
    getTree(rootNodeId: $rootNodeId, orgId: $orgId) {
      id
      parentId
      path
      nodeType
      name
      metadata
    }
  }
`;

const SAVE_NODE = /* GraphQL */ `
  mutation SaveNode($input: SaveNodeInput!) {
    saveNode(input: $input) {
      success
      message
      id
      nodeId
      path
      entity
    }
  }
`;

const UPDATE_NODE = /* GraphQL */ `
  mutation UpdateNodeMutation($id: ID!, $input: UpdateNodeInput!) {
    updateNode(id: $id, input: $input) {
      success
      message
      id
      path
      entity
    }
  }
`;

const DELETE_NODE = /* GraphQL */ `
  mutation DeleteNodeMutation($id: ID!) {
    deleteNode(id: $id) {
      success
      message
      id
      path
      entity
    }
  }
`;

const ON_NODE_CHANGED = /* GraphQL */ `
  subscription OnNodeChanged {
    onNodeChanged {
      success
      message
      id
      path
      entity
    }
  }
`;

const ORG_SCOPE_SESSION_KEY = 'sms_location_org_scope_segment';

function normalizeOrgScopeSegment(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
}

@Injectable({ providedIn: 'root' })
export class LocationNodeAppSyncService {
  /** authMode por defecto alinea con amplify-config.ts (userPool); evita modo implícito `iam`. */
  private readonly client = generateClient({ authMode: 'userPool' });
  private readonly auth = inject(AuthService);

  /**
   * Segmento ORG# de la PK (mismo valor que en Dynamo). Persiste en sessionStorage para que
   * `getTree` siga funcionando cuando el Id Token no trae `custom:organization_id`.
   */
  rememberOrganizationScope(segment: string | null | undefined): void {
    const s = segment ? normalizeOrgScopeSegment(segment) : '';
    try {
      if (s) {
        globalThis.sessionStorage?.setItem(ORG_SCOPE_SESSION_KEY, s);
      }
    } catch {
      /* SSR / privacy mode */
    }
  }

  clearOrganizationScopeHint(): void {
    try {
      globalThis.sessionStorage?.removeItem(ORG_SCOPE_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }

  private readStoredOrgScope(): string | null {
    try {
      const v = globalThis.sessionStorage?.getItem(ORG_SCOPE_SESSION_KEY)?.trim();
      return v ? normalizeOrgScopeSegment(v) : null;
    } catch {
      return null;
    }
  }

  private inferOrgFromMutationResponse(res: LocationMutationResponse): void {
    const fromNodeId = res.nodeId ? normalizeOrgScopeSegment(String(res.nodeId)) : '';
    if (fromNodeId) {
      this.rememberOrganizationScope(fromNodeId);
      return;
    }
    const id = res.id != null ? String(res.id).trim() : '';
    const m = /^ORGANIZATION#(.+)$/i.exec(id);
    if (m) {
      this.rememberOrganizationScope(m[1]);
    }
  }

  private async executeGraphql<TResult>(query: string, variables?: Record<string, unknown>): Promise<TResult> {
    const raw: unknown =
      variables === undefined
        ? await this.client.graphql({ query })
        : await this.client.graphql({ query, variables });
    const response = raw as QueryResult<TResult>;
    if (!response.data) {
      throw new Error('GraphQL no devolvió datos');
    }
    return response.data;
  }

  assertSuccess(res: LocationMutationResponse | null | undefined, label: string): void {
    if (!res || res.success !== true) {
      throw new Error(res?.message ?? `${label}: respuesta sin éxito`);
    }
  }

  /** Serializa objeto metadata para AWSJSON. */
  static metadataToAwsJson(metadata: Record<string, unknown> | undefined | null): string {
    return JSON.stringify(metadata ?? {});
  }

  /** Parse robusto tras la query (AWSJSON puede venir ya como objeto desde Amplify). */
  parseMetadata(meta: GraphqlNodeDto['metadata']): Record<string, unknown> {
    if (meta == null) return {};
    if (typeof meta === 'object' && meta !== null && !Array.isArray(meta)) return meta as Record<string, unknown>;
    if (typeof meta === 'string') {
      const s = meta.trim();
      if (!s) return {};
      try {
        let parsed: unknown = JSON.parse(s);
        // Backend a veces devuelve JSON.stringify(JSON.stringify(obj)) → primer parse devuelve string JSON.
        if (typeof parsed === 'string') {
          const inner = parsed.trim();
          if (inner) parsed = JSON.parse(inner);
        }
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
        return {};
      } catch {
        return {};
      }
    }
    return {};
  }

  /**
   * Resuelve `orgId` para la PK backend:
   * argumento explícito → session (último guardado) → claim Cognito → rootNodeId `ORGANIZATION#…`.
   */
  async getTree(rootNodeId?: string | null, orgId?: string | null): Promise<GraphqlNodeDto[]> {
    let resolvedOrg = (orgId ?? '').trim() || null;
    if (!resolvedOrg) {
      resolvedOrg = this.readStoredOrgScope();
    }
    if (!resolvedOrg) {
      resolvedOrg = await this.auth.getOrganizationIdClaim();
    }
    if (!resolvedOrg && rootNodeId) {
      const m = /^ORGANIZATION#(.+)$/i.exec(String(rootNodeId).trim());
      if (m) {
        resolvedOrg = normalizeOrgScopeSegment(m[1]);
      }
    }

    const data = await this.executeGraphql<{ getTree: GraphqlNodeDto[] | null }>(GET_TREE, {
      rootNodeId: rootNodeId ?? null,
      orgId: resolvedOrg ?? null
    });
    const list = data.getTree;
    if (!Array.isArray(list)) {
      if (isDevMode()) {
        console.warn('[SMS Location] getTree: campo getTree no es un array', {
          rootNodeId: rootNodeId ?? null,
          value: list
        });
      }
      return [];
    }
    if (list.length > 0) {
      if (resolvedOrg) {
        this.rememberOrganizationScope(resolvedOrg);
      } else {
        const rootOrgRow = list.find(
          (n) =>
            String(n.nodeType ?? '').toUpperCase() === 'ORGANIZATION' ||
            /^ORGANIZATION#/i.test(String(n.id ?? ''))
        );
        const sk = rootOrgRow?.id != null ? String(rootOrgRow.id).trim() : '';
        const om = /^ORGANIZATION#(.+)$/i.exec(sk);
        if (om) {
          this.rememberOrganizationScope(om[1]);
        }
      }
    }
    if (isDevMode()) {
      console.debug(
        `[SMS Location] getTree(rootNodeId=${rootNodeId ?? 'null'}, orgId=${resolvedOrg ?? 'null'}): ${list.length} nodo(s)`,
        list
      );
    }
    return list;
  }

  async saveNode(input: SaveNodeGraphqlInput): Promise<LocationMutationResponse> {
    const orgHint = input.orgId ? normalizeOrgScopeSegment(String(input.orgId)) : '';
    if (orgHint) {
      this.rememberOrganizationScope(orgHint);
    }
    const data = await this.executeGraphql<{ saveNode: LocationMutationResponse }>(SAVE_NODE, {
      input: {
        id: input.id ?? null,
        nodeId: input.nodeId ?? null,
        orgId: input.orgId ?? null,
        parentId: input.parentId ?? null,
        nodeType: input.nodeType,
        name: input.name,
        metadata: input.metadata
      }
    });
    if (!data.saveNode) {
      throw new Error('saveNode devolvió vacío');
    }
    if (data.saveNode.success === true) {
      this.inferOrgFromMutationResponse(data.saveNode);
    }
    return data.saveNode;
  }

  async updateNode(id: string, input: UpdateNodeGraphqlInput): Promise<LocationMutationResponse> {
    const data = await this.executeGraphql<{ updateNode: LocationMutationResponse }>(UPDATE_NODE, {
      id,
      input: {
        name: input.name ?? null,
        metadata: input.metadata ?? null
      }
    });
    if (!data.updateNode) {
      throw new Error('updateNode devolvió vacío');
    }
    return data.updateNode;
  }

  async deleteNode(id: string): Promise<LocationMutationResponse> {
    const data = await this.executeGraphql<{ deleteNode: LocationMutationResponse }>(DELETE_NODE, { id });
    if (!data.deleteNode) {
      throw new Error('deleteNode devolvió vacío');
    }
    return data.deleteNode;
  }

  /**
   * Observa cambios aplicados desde save/update/delete Node.
   * El consumidor (LocationService) debe re-sincronizar el árbol.
   */
  onNodeChanges(): Observable<LocationMutationResponse> {
    const stream = this.client.graphql({
      query: ON_NODE_CHANGED
    }) as Observable<{ data?: { onNodeChanged?: LocationMutationResponse } }>;

    return stream.pipe(
      filter((evt) => evt.data?.onNodeChanged != null),
      map((evt) => evt.data!.onNodeChanged as LocationMutationResponse)
    );
  }
}
