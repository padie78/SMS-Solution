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
    nodeType: item.entityType ?? item.nodeType,
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
      nodeId: null,
      path: null,
      entity: null
    };
  }
  return {
    success: true,
    message: null,
    id: item.SK ?? null,
    nodeId: null,
    path: item.path ?? null,
    entity: JSON.stringify(item)
  };
}

/** Respuesta alta ORGANIZATION: incluye nodeId limpio para redirección en Angular. */
function mutationResponseFromOrganizationSave(result) {
  if (!result?.success || !result.item) {
    return {
      success: false,
      message: result?.message ?? "saveOrganization no devolvió un ítem",
      id: null,
      nodeId: null,
      path: null,
      entity: null
    };
  }
  const item = result.item;
  return {
    success: true,
    message: null,
    id: item.SK ?? null,
    nodeId: result.nodeId ?? null,
    path: result.path ?? item.path ?? null,
    entity: JSON.stringify(item)
  };
}

export class HandleAppSyncRequest {
  constructor(deps) {
    this.deps = deps;
  }

  async execute(params) {
    const { methodName, partitionContext, args } = params;
    const ctx = partitionContext;

    switch (methodName) {
      case "saveNode": {
        const inp = args?.input ?? {};
        const nodeTypeUpper = String(inp.nodeType ?? "").toUpperCase();

        if (nodeTypeUpper === "ORGANIZATION") {
          const parentRaw = String(inp.parentId ?? "ROOT").trim().toUpperCase();
          if (parentRaw && parentRaw !== "ROOT") {
            throw new ValidationError("La raíz ORGANIZATION exige parentId = ROOT (u omitir el campo).");
          }
          if (!String(ctx.tenantId ?? "").trim()) {
            throw new ValidationError("custom:tenant_id es requerido para crear una organización.");
          }
          const orgResult = await this.deps.configService.saveOrganizationRootNode(ctx.tenantId, {
            id: inp.id ?? undefined,
            nodeId: inp.nodeId,
            name: inp.name,
            metadata: metadataFromInput(inp.metadata)
          });
          return mutationResponseFromOrganizationSave(orgResult);
        }

        if (!String(ctx.organizationScopeId ?? "").trim()) {
          throw new ValidationError(
            "orgId en SaveNodeInput, custom:organization_id en el token o DEFAULT_ORGAN_SCOPE_ID en la Lambda es requerido para la PK."
          );
        }
        const parentId = inp.parentId;
        if (parentId == null || String(parentId).trim() === "") {
          throw new ValidationError("parentId es requerido para nodos distintos de ORGANIZATION.");
        }
        const raw = await this.deps.configService.saveNode(ctx, {
          id: inp.id ?? undefined,
          orgId: inp.orgId,
          parentId,
          nodeType: inp.nodeType,
          name: inp.name,
          metadata: metadataFromInput(inp.metadata)
        });
        if (!raw?.success || !raw?.item) {
          return {
            success: false,
            message: raw?.message ?? "saveNode no devolvió un ítem",
            id: null,
            nodeId: null,
            path: null,
            entity: null
          };
        }
        return mutationResponseFromItem(raw.item);
      }

      case "updateNode": {
        if (!String(ctx.organizationScopeId ?? "").trim()) {
          throw new ValidationError(
            "orgId en la mutación, claims de organización o DEFAULT_ORGAN_SCOPE_ID requerido para la PK."
          );
        }
        if (!args.id) throw new ValidationError("El ID del nodo es requerido para actualizar");
        const inp = args?.input ?? {};
        const payload = {};
        if (inp.name !== undefined && inp.name !== null) payload.name = inp.name;
        if (inp.metadata !== undefined && inp.metadata !== null) {
          payload.metadata = metadataFromInput(inp.metadata);
        }
        const r = await this.deps.configService.updateNode(ctx, args.id, payload);
        if (!r.success) {
          return {
            success: false,
            message: r.message ?? "No se pudo actualizar el nodo",
            id: args.id,
            nodeId: null,
            path: null,
            entity: null
          };
        }
        return mutationResponseFromItem(r.data);
      }

      case "deleteNode": {
        if (!String(ctx.organizationScopeId ?? "").trim()) {
          throw new ValidationError(
            "orgId en la mutación, claims de organización o DEFAULT_ORGAN_SCOPE_ID requerido para la PK."
          );
        }
        if (!args.id) throw new ValidationError("ID requerido para eliminar");
        const r = await this.deps.configService.deleteNode(ctx, args.id);
        if (!r.success) {
          return {
            success: false,
            message: r.message ?? "No se pudo eliminar el nodo",
            id: args.id,
            nodeId: null,
            path: null,
            entity: null
          };
        }
        return {
          success: true,
          message: r.message ?? null,
          id: args.id,
          nodeId: null,
          path: null,
          entity: null
        };
      }

      case "getNode": {
        if (!String(ctx.organizationScopeId ?? "").trim()) {
          throw new ValidationError(
            "Falta el segmento ORG de la PK: pasá orgId en la query, custom:organization_id en el token, " +
              "DEFAULT_ORGAN_SCOPE_ID en Lambda, o usá id con formato ORGANIZATION#<ID_REAL>."
          );
        }
        if (!args.id) throw new ValidationError("id es requerido");
        const item = await this.deps.configService.getNode(ctx, args.id);
        return mapItemToGraphqlNode(item);
      }

      case "getTree": {
        if (!String(ctx.organizationScopeId ?? "").trim()) {
          throw new ValidationError(
            "Falta el segmento ORG de la PK: pasá orgId, custom:organization_id, DEFAULT_ORGAN_SCOPE_ID en Lambda, " +
              "o rootNodeId con formato ORGANIZATION#<ID_REAL> (el árbol infiere la org desde el SK raíz)."
          );
        }
        let underPath;
        if (args.rootNodeId) {
          const root = await this.deps.configService.getNode(ctx, args.rootNodeId);
          underPath = root?.path ?? undefined;
          if (underPath === undefined) {
            return [];
          }
        }
        const items = await this.deps.configService.listNodes(
          ctx,
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
