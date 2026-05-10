import { ValidationError } from "../domain/errors.js";

/**
 * AppSync puede invocar la Lambda con el contexto completo o únicamente con el
 * JSON generado desde el mapping template (`holdingId`, `arguments`, `identity`, `info`).
 * @returns {*}
 */
export function normalizeAppSyncLambdaEvent(raw) {
  if (raw == null) return raw;
  const hasEnvelope =
    typeof raw === "object" &&
    typeof raw.arguments === "object" &&
    typeof raw.identity === "object" &&
    raw.info !== undefined;

  const hasClassicFieldName =
    raw.info?.fieldName != null || typeof raw.fieldName === "string";

  if (hasEnvelope && hasClassicFieldName) {
    return raw;
  }

  if (hasEnvelope) {
    return {
      holdingId: raw.holdingId,
      arguments: raw.arguments ?? {},
      identity: raw.identity,
      info: raw.info ?? { fieldName: "unknown", parentTypeName: "Mutation" },
      prev: raw.prev,
      stash: raw.stash,
      requestContext: raw.requestContext,
    };
  }

  return raw;
}

/**
 * Contexto de partición Dynamo (multi-tenant). **No** tomar tenant desde argumentos GraphQL.
 *
 * - `tenantId`: obligatorio vía `identity.claims['custom:tenant_id']` (Cognito User Pools).
 * - `organizationScopeId`: `custom:organization_id` o, si falta, el mismo valor que tenant
 *   (tenant mono-organización).
 *
 * @throws {ValidationError} si falta `custom:tenant_id` (salvo ALLOW_ANON_TENANT_FALLBACK en dev)
 * @returns {{ tenantId: string, organizationScopeId: string }}
 */
export function resolvePartitionContextFromEvent(event) {
  const claims = event?.identity?.claims ?? {};

  const tenantId =
    typeof claims["custom:tenant_id"] === "string" ? claims["custom:tenant_id"].trim() : "";

  if (!tenantId) {
    if (process.env.ALLOW_ANON_TENANT_FALLBACK === "true") {
      const fb = (process.env.DEV_TENANT_ID || "").trim();
      const org = (process.env.DEV_ORG_SCOPE_ID || fb).trim();
      if (fb) {
        return { tenantId: fb, organizationScopeId: org || fb };
      }
    }
    throw new ValidationError(
      "Multi-tenant: el token debe incluir el claim custom:tenant_id. No se admite tenant en argumentos de mutación."
    );
  }

  const organizationScopeIdRaw =
    typeof claims["custom:organization_id"] === "string"
      ? claims["custom:organization_id"].trim()
      : "";

  const organizationScopeId = organizationScopeIdRaw || tenantId;

  return { tenantId, organizationScopeId };
}
