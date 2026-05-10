import { Injectable, isDevMode } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { Observable, filter, map } from 'rxjs';
import type {
  GraphqlNodeDto,
  LocationMutationResponse,
  SaveNodeGraphqlInput,
  UpdateNodeGraphqlInput
} from './location-api.models';

type QueryResult<T> = { data?: T };

const GET_TREE = /* GraphQL */ `
  query GetTree($rootNodeId: ID) {
    getTree(rootNodeId: $rootNodeId) {
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

@Injectable({ providedIn: 'root' })
export class LocationNodeAppSyncService {
  /** authMode por defecto alinea con amplify-config.ts (userPool); evita modo implícito `iam`. */
  private readonly client = generateClient({ authMode: 'userPool' });

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

  async getTree(rootNodeId?: string | null): Promise<GraphqlNodeDto[]> {
    const data = await this.executeGraphql<{ getTree: GraphqlNodeDto[] | null }>(
      GET_TREE,
      {
        rootNodeId: rootNodeId ?? null
      }
    );
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
    if (isDevMode()) {
      console.debug(
        `[SMS Location] getTree(rootNodeId=${rootNodeId ?? 'null'}): ${list.length} nodo(s)`,
        list
      );
    }
    return list;
  }

  async saveNode(input: SaveNodeGraphqlInput): Promise<LocationMutationResponse> {
    const data = await this.executeGraphql<{ saveNode: LocationMutationResponse }>(SAVE_NODE, {
      input: {
        id: input.id ?? null,
        parentId: input.parentId,
        nodeType: input.nodeType,
        name: input.name,
        metadata: input.metadata
      }
    });
    if (!data.saveNode) {
      throw new Error('saveNode devolvió vacío');
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
