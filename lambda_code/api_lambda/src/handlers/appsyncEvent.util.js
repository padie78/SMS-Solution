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

/** @param {Record<string, unknown>} claims @param {string} key */
function pickClaim(claims, key) {
  const v = claims[key];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Contexto de partición Dynamo (multi-tenant). **No** tomar tenant desde argumentos GraphQL.
 *
 * Resolución de `tenantId` (primer valor no vacío):
 * 1. `custom:tenant_id` (recomendado producción)
 * 2. Si `STRICT_TENANT_CLAIM_ONLY` ≠ `true`: `custom:holding_id`, `custom:organization_id`, `sub`
 *
 * `organizationScopeId`: `custom:organization_id` → `custom:holding_id` → igual que `tenantId`.
 *
 * @throws {ValidationError} si no hay ningún identificador usable
 * @returns {{ tenantId: string, organizationScopeId: string }}
 */
export function resolvePartitionContextFromEvent(event) {
  const claims = event?.identity?.claims ?? {};
  const strict = process.env.STRICT_TENANT_CLAIM_ONLY === "true";

  const customTenantId = pickClaim(claims, "custom:tenant_id");
  const holdingId = pickClaim(claims, "custom:holding_id");
  const organizationId = pickClaim(claims, "custom:organization_id");
  const sub = pickClaim(claims, "sub");

  let tenantId = customTenantId;
  if (!tenantId && !strict) {
    tenantId = holdingId || organizationId || sub;
    if (tenantId && !customTenantId) {
      console.warn(
        "[MULTI_TENANT] Resolviendo tenant sin custom:tenant_id; usar holding_id / organization_id / sub. " +
          "Definí custom:tenant_id en Cognito y/o STRICT_TENANT_CLAIM_ONLY=true en prod."
      );
    }
  }

  if (!tenantId) {
    if (process.env.ALLOW_ANON_TENANT_FALLBACK === "true") {
      const fb = (process.env.DEV_TENANT_ID || "").trim();
      const org = (process.env.DEV_ORG_SCOPE_ID || fb).trim();
      if (fb) {
        return { tenantId: fb, organizationScopeId: org || fb };
      }
    }
    throw new ValidationError(
      "Multi-tenant: el JWT no incluye un identificador de tenant. " +
        "Agregá en Cognito el claim custom:tenant_id (recomendado), o custom:holding_id / custom:organization_id, " +
        "o en desarrollo ALLOW_ANON_TENANT_FALLBACK=true y DEV_TENANT_ID. " +
        "Modo estricto solo custom:tenant_id: STRICT_TENANT_CLAIM_ONLY=true."
    );
  }

  const organizationScopeId = organizationId || holdingId || tenantId;

  return { tenantId, organizationScopeId };
}
