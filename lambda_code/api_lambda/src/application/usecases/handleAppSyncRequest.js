import { ValidationError } from "../../domain/errors.js";

function metadataFromInput(raw) {
  if (raw == null) return {};
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return {};
    try {
      return JSON.parse(s);
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  return {};
}

function mapItemToGraphqlNode(item) {
  if (!item) return null;
  let meta = item.metadata;
  if (meta != null && typeof meta !== "string") {
    meta = JSON.stringify(meta);
  }
  return {
    id: item.SK,
    parentId: item.parentId ?? null,
    path: item.path,
    nodeType: item.nodeType,
    name: item.name,
    metadata: meta ?? null
  };
}

function mutationResponseFromItem(item) {
  if (!item) {
    return {
      success: false,
      message: "Operación no produjo resultado",
      id: null,
      path: null,
      entity: null
    };
  }
  return {
    success: true,
    message: null,
    id: item.SK ?? null,
    path: item.path ?? null,
    entity: JSON.stringify(item)
  };
}

export class HandleAppSyncRequest {
  constructor(deps) {
    this.deps = deps;
  }

  async execute(params) {
    const { methodName, orgId, tenantId, holdingId, args } = params;

    const orgScope = holdingId || orgId || tenantId;

    switch (methodName) {
      case "saveNode": {
        const inp = args?.input ?? {};
        const raw = await this.deps.configService.saveNode(orgScope, {
          id: inp.id ?? undefined,
          parentId: inp.parentId,
          nodeType: inp.nodeType,
          name: inp.name,
          metadata: metadataFromInput(inp.metadata)
        });
        if (!raw?.item) {
          return {
            success: false,
            message: raw?.message ?? "saveNode no devolvió un ítem",
            id: null,
            path: null,
            entity: null
          };
        }
        return mutationResponseFromItem(raw.item);
      }

      case "updateNode": {
        if (!args.id) throw new ValidationError("El ID del nodo es requerido para actualizar");
        const inp = args.input ?? {};
        const payload = {};
        if (inp.name !== undefined && inp.name !== null) payload.name = inp.name;
        if (inp.metadata !== undefined && inp.metadata !== null) {
          payload.metadata = metadataFromInput(inp.metadata);
        }
        const r = await this.deps.configService.updateNode(orgScope, args.id, payload);
        if (!r.success) {
          return {
            success: false,
            message: r.message ?? "No se pudo actualizar el nodo",
            id: args.id,
            path: null,
            entity: null
          };
        }
        return mutationResponseFromItem(r.data);
      }

      case "deleteNode": {
        if (!args.id) throw new ValidationError("ID requerido para eliminar");
        const r = await this.deps.configService.deleteNode(orgScope, args.id);
        if (!r.success) {
          return {
            success: false,
            message: r.message ?? "No se pudo eliminar el nodo",
            id: args.id,
            path: null,
            entity: null
          };
        }
        return {
          success: true,
          message: r.message ?? null,
          id: args.id,
          path: null,
          entity: null
        };
      }

      case "getNode": {
        if (!args.id) throw new ValidationError("id es requerido");
        const item = await this.deps.configService.getNode(orgScope, args.id);
        return mapItemToGraphqlNode(item);
      }

      case "getTree": {
        let underPath;
        if (args.rootNodeId) {
          const root = await this.deps.configService.getNode(orgScope, args.rootNodeId);
          underPath = root?.path ?? undefined;
          if (underPath === undefined) {
            return [];
          }
        }
        const items = await this.deps.configService.listNodes(
          orgScope,
          underPath ? { underPath } : {}
        );
        return items.map(mapItemToGraphqlNode).filter(Boolean);
      }

      case "getInvoice":
        // Stub: exponer cuando exista modelo SK/payload de facturas en Dynamo.
        return null;

      default:
        throw new ValidationError(`Resolver "${methodName}" no implementado en el backend.`);
    }
  }
}
