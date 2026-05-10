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
 * Claims efectivos: AppSync suele poner `sub` en `identity.sub`; el objeto `claims` a veces llega vacío o sin `sub`.
 * @param {unknown} event
 * @returns {Record<string, unknown>}
 */
function buildEffectiveClaims(event) {
  const identity = event?.identity;
  if (!identity || typeof identity !== "object") {
    return {};
  }

  const base =
    identity.claims && typeof identity.claims === "object" && !Array.isArray(identity.claims)
      ? { ...identity.claims }
      : {};

  // Cognito: sub a nivel identity
  if (typeof identity.sub === "string" && identity.sub.trim()) {
    if (base.sub == null || String(base.sub).trim() === "") {
      base.sub = identity.sub.trim();
    }
  }

  if (typeof identity.username === "string" && identity.username.trim()) {
    if (base["cognito:username"] == null || String(base["cognito:username"]).trim() === "") {
      base["cognito:username"] = identity.username.trim();
    }
  }

  return base;
}

/** @param {Record<string, unknown>} claims @param {string} key */
function pickClaim(claims, key) {
  const v = claims[key];
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

/**
 * Contexto de partición Dynamo (multi-tenant). **No** tomar tenant desde argumentos GraphQL.
 *
 * Orden de `tenantId` (si STRICT_TENANT_CLAIM_ONLY ≠ true):
 * custom:tenant_id → custom:holding_id → custom:organization_id → sub → cognito:username
 *
 * Override emergencia (misma Lambda, sin tocar Cognito): **LAMBDA_DEFAULT_TENANT_ID** o **DEV_TENANT_ID**
 * (útil hasta redeploy + claims). **ALLOW_ANON_TENANT_FALLBACK** sigue soportado.
 *
 * @throws {ValidationError}
 * @returns {{ tenantId: string, organizationScopeId: string }}
 */
export function resolvePartitionContextFromEvent(event) {
  const claims = buildEffectiveClaims(event);
  const strict = process.env.STRICT_TENANT_CLAIM_ONLY === "true";

  const customTenantId = pickClaim(claims, "custom:tenant_id");
  const holdingId = pickClaim(claims, "custom:holding_id");
  const organizationId = pickClaim(claims, "custom:organization_id");
  const sub = pickClaim(claims, "sub");
  const username = pickClaim(claims, "cognito:username");

  let tenantId = customTenantId;
  if (!tenantId && !strict) {
    tenantId = holdingId || organizationId || sub || username;
    if (tenantId && !customTenantId) {
      console.warn(
        "[MULTI_TENANT] Tenant resuelto sin custom:tenant_id (holding/organization/sub/username). " +
          "Configurá custom:tenant_id en Cognito y STRICT_TENANT_CLAIM_ONLY=true en producción."
      );
    }
  }

  if (!tenantId) {
    const envDefault = (
      process.env.LAMBDA_DEFAULT_TENANT_ID ||
      process.env.DEV_TENANT_ID ||
      ""
    ).trim();
    if (envDefault) {
      const org = (process.env.DEV_ORG_SCOPE_ID || envDefault).trim();
      console.warn(
        "[MULTI_TENANT] Usando LAMBDA_DEFAULT_TENANT_ID / DEV_TENANT_ID: el token no aportó tenant usable."
      );
      return { tenantId: envDefault, organizationScopeId: org };
    }
    if (process.env.ALLOW_ANON_TENANT_FALLBACK === "true") {
      const fb = (process.env.DEV_TENANT_ID || "").trim();
      const org = (process.env.DEV_ORG_SCOPE_ID || fb).trim();
      if (fb) {
        return { tenantId: fb, organizationScopeId: org || fb };
      }
    }
    throw new ValidationError(
      "Multi-tenant: el token no aporta identificador de tenant (custom:tenant_id, holding, organization_id o sub). " +
        "Opciones: (1) claims en Cognito, (2) variable LAMBDA_DEFAULT_TENANT_ID en la Lambda, " +
        "(3) redeploy con la última versión del resolver. " +
        "Si el texto del error sólo menciona custom:tenant_id, la Lambda desplegada está desactualizada."
    );
  }

  const organizationScopeId = organizationId || holdingId || tenantId;

  return { tenantId, organizationScopeId };
}
