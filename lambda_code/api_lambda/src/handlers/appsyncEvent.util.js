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

/** Segmento ORG# de la PK solo desde env si no hay claims ni `orgId` en GraphQL. Sin valor sintético fijo. */
function envOrganizationScopeFallback() {
  return (process.env.DEFAULT_ORGAN_SCOPE_ID || "").trim();
}

/**
 * Si el cliente envía el SK del nodo raíz (`ORGANIZATION#CB7647AC`), el segmento tras `#` es el ID real de
 * partición; permite `getTree`/`getNode` sin `orgId` en la query ni claim `custom:organization_id`.
 * @param {string | undefined | null} skLike p. ej. args.rootNodeId o args.id
 * @returns {string}
 */
export function inferOrganizationScopeFromNodeSk(skLike) {
  const s = String(skLike ?? "").trim();
  const m = /^ORGANIZATION#(.+)$/i.exec(s);
  if (!m) return "";
  return m[1].trim().toUpperCase().replace(/\s+/g, "-");
}

/**
 * Prioridad del ID real de organización: `input.orgId` → `args.orgId` → claims → **rootNodeId/id** si es `ORGANIZATION#…` → **DEFAULT_ORGAN_SCOPE_ID**.
 * @param {{ tenantId: string, organizationScopeId: string }} baseCtx
 * @param {Record<string, unknown> | null | undefined} args argumentos GraphQL (puede incluir `input` anidado)
 */
export function mergePartitionContextFromGraphQLArgs(baseCtx, args) {
  if (!baseCtx || typeof baseCtx !== "object") {
    return baseCtx;
  }
  const inp = args?.input;
  const fromInput =
    inp != null && typeof inp === "object"
      ? String(
          /** @type {Record<string, unknown>} */ (inp).orgId ??
            /** @type {Record<string, unknown>} */ (inp).organizationId ??
            ""
        ).trim()
      : "";
  const fromRoot = String(args?.orgId ?? args?.organizationId ?? "").trim();
  const fromSkHint =
    inferOrganizationScopeFromNodeSk(
      /** @type {string | undefined} */ (args?.rootNodeId)
    ) ||
    inferOrganizationScopeFromNodeSk(
      /** @type {string | undefined} */ (args?.id)
    );
  const mergedOrg =
    fromInput ||
    fromRoot ||
    String(baseCtx.organizationScopeId ?? "").trim() ||
    fromSkHint ||
    envOrganizationScopeFallback();
  return { ...baseCtx, organizationScopeId: mergedOrg };
}

/**
 * Contexto de partición Dynamo (multi-tenant). **No** tomar tenant desde argumentos GraphQL.
 *
 * Orden de `tenantId` (si STRICT_TENANT_CLAIM_ONLY ≠ true):
 * custom:tenant_id → custom:holding_id → custom:organization_id → sub → cognito:username
 *
 * Override emergencia (misma Lambda, sin tocar Cognito): **LAMBDA_DEFAULT_TENANT_ID** o **DEV_TENANT_ID**
 * (útil hasta redeploy + claims). **DEFAULT_ORGAN_SCOPE_ID** fuerza el segmento ORG# si no hay claims ni `orgId` en GraphQL.
 * Si sigue vacío, se usa **el mismo `tenantId`** como segmento ORG (1 org por tenant) hasta que exista `custom:organization_id`.
 * **ALLOW_ANON_TENANT_FALLBACK** sigue soportado.
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
      const org = (process.env.DEV_ORG_SCOPE_ID || envOrganizationScopeFallback()).trim();
      console.warn(
        "[MULTI_TENANT] Usando LAMBDA_DEFAULT_TENANT_ID / DEV_TENANT_ID: el token no aportó tenant usable."
      );
      return { tenantId: envDefault, organizationScopeId: org };
    }
    if (process.env.ALLOW_ANON_TENANT_FALLBACK === "true") {
      const fb = (process.env.DEV_TENANT_ID || "").trim();
      const org = (process.env.DEV_ORG_SCOPE_ID || envOrganizationScopeFallback()).trim();
      if (fb) {
        return { tenantId: fb, organizationScopeId: org };
      }
    }
    throw new ValidationError(
      "Multi-tenant: el token no aporta identificador de tenant (custom:tenant_id, holding, organization_id o sub). " +
        "Opciones: (1) claims en Cognito, (2) variable LAMBDA_DEFAULT_TENANT_ID en la Lambda, " +
        "(3) redeploy con la última versión del resolver. " +
        "Si el texto del error sólo menciona custom:tenant_id, la Lambda desplegada está desactualizada."
    );
  }

  let organizationScopeId = organizationId || holdingId || envOrganizationScopeFallback();

  // 1 tenant ⇄ 1 org por defecto: si no hay claim de org, el segmento ORG# no puede quedar vacío
  // (getTree / PK). Quien use un id org distinto al tenant (p. ej. CB7647AC) debe setear custom:organization_id.
  if (!organizationScopeId && tenantId) {
    organizationScopeId = tenantId;
    console.warn(
      "[PARTITION] Sin custom:organization_id (ni DEV_ORG/DEFAULT_ORG en env); usando tenantId como segmento ORG#. " +
        "Si tu PK en Dynamo usa otro id, definí custom:organization_id en Cognito o pasá orgId en GraphQL."
    );
  }

  return { tenantId, organizationScopeId };
}
