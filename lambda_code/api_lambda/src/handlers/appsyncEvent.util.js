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

/** Segmento ORG# desde env si no hay claims ni `orgId` en GraphQL */
function envOrganizationScopeFallback() {
  return (process.env.DEFAULT_ORGAN_SCOPE_ID || "").trim();
}

/**
 * Si el cliente envía el SK del nodo raíz (`ORGANIZATION#<nodeId>`), extrae <nodeId> para la partición.
 * @param {string | undefined | null} skLike
 * @returns {string}
 */
export function inferOrganizationScopeFromNodeSk(skLike) {
  const s = String(skLike ?? "").trim();
  const m = /^ORGANIZATION#(.+)$/i.exec(s);
  if (!m) return "";
  return m[1].trim().toUpperCase().replace(/\s+/g, "-");
}

/**
 * Prioridad del ID de partición org: `input.orgId` → `args.orgId` → claims → SK `ORGANIZATION#…` → env.
 * @param {{ tenantId: string, organizationScopeId: string }} baseCtx
 * @param {Record<string, unknown> | null | undefined} args
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
 * **tenantId** preferentemente desde `custom:tenant_id` (holding/dueño).
 *
 * Desarrollo sin claim en Cognito: **LAMBDA_DEFAULT_TENANT_ID** / **DEV_TENANT_ID**, o
 * **ALLOW_TENANT_FALLBACK_FROM_SUB=true** (usa `sub` del Id Token como tenant provisional).
 *
 * **organizationScopeId**: partición org (claims, `orgId` GraphQL o env).
 *
 * @throws {ValidationError}
 * @returns {{ tenantId: string, organizationScopeId: string }}
 */
export function resolvePartitionContextFromEvent(event) {
  const claims = buildEffectiveClaims(event);

  let tenantId = pickClaim(claims, "custom:tenant_id");

  if (!tenantId) {
    const envDefault = (
      process.env.LAMBDA_DEFAULT_TENANT_ID ||
      process.env.DEV_TENANT_ID ||
      ""
    ).trim();
    if (envDefault) {
      console.warn(
        "[MULTI_TENANT] custom:tenant_id ausente; usando LAMBDA_DEFAULT_TENANT_ID / DEV_TENANT_ID (solo desarrollo)."
      );
      tenantId = envDefault;
    } else if (process.env.ALLOW_ANON_TENANT_FALLBACK === "true") {
      const fb = (process.env.DEV_TENANT_ID || "").trim();
      if (fb) {
        tenantId = fb;
      }
    } else if (process.env.ALLOW_TENANT_FALLBACK_FROM_SUB === "true") {
      tenantId = pickClaim(claims, "sub");
      if (tenantId) {
        console.warn(
          "[MULTI_TENANT] ALLOW_TENANT_FALLBACK_FROM_SUB: usando `sub` como tenantId (configurá custom:tenant_id en Cognito para producción)."
        );
      }
    }
  }

  if (!tenantId) {
    throw new ValidationError(
      "Aislamiento: falta el claim custom:tenant_id en el Id Token. Opciones: (1) Definir el atributo en Cognito y asignarlo al usuario, " +
        "(2) Variables LAMBDA_DEFAULT_TENANT_ID o DEV_TENANT_ID en la Lambda, " +
        "(3) En desarrollo: ALLOW_TENANT_FALLBACK_FROM_SUB=true para usar el sub de Cognito como tenant provisional."
    );
  }

  const organizationId = pickClaim(claims, "custom:organization_id");
  const holdingId = pickClaim(claims, "custom:holding_id");
  const organizationScopeId = organizationId || holdingId || envOrganizationScopeFallback();

  return { tenantId, organizationScopeId };
}
