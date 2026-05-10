/**
 * Single-table PK para nodos de jerarquía bajo multi-tenant Cognito.
 * Formato: `TENANT#<tenantId>#ORG#<organizationScopeId>`
 *
 * - `tenantId`: claim obligatorio `custom:tenant_id` (UUID o identificador estable).
 * - `organizationScopeId`: ID real de la organización (segmento ORG#), p. ej. **CB7647AC**;
 *   proviene de claims, `orgId` en GraphQL o **DEFAULT_ORGAN_SCOPE_ID** en Lambda.
 *
 * Todos los SK (p. ej. ORGANIZATION#..., REGION#...) comparten el mismo PK dentro de esa org.
 */

/**
 * Si el segmento es un UUID (con o sin guiones), lo normaliza al formato con guiones en
 * posiciones estándar. Así `custom:tenant_id` / `orgId` en GraphQL coinciden con la PK
 * guardada en Dynamo aunque vengan como 32 hex pegados.
 * @param {string} s ya en mayúsculas / trimmed
 * @returns {string}
 */
function canonicalizeUuidLikeSegment(s) {
  const hex = s.replace(/-/g, "");
  if (!/^[0-9A-F]{32}$/.test(hex)) {
    return s;
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Segmentos de PK/SK en MAYÚSCULAS (evita misses en query). */
export function normalizePartitionSegment(raw) {
  let s = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
  return canonicalizeUuidLikeSegment(s);
}

export function normalizeOrgScopeSegment(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  let seg;
  if (s.includes("#")) {
    const parts = s.split("#").filter(Boolean);
    const last = parts[parts.length - 1];
    seg = last ? last.trim() : "";
  } else {
    seg = s;
  }
  return normalizePartitionSegment(seg);
}

/**
 * @param {string | undefined | null} tenantId
 * @param {string | undefined | null} organizationScopeId segmento ORG (misma convención que antes bajo ORG#)
 * @returns {string} PK DynamoDB para todos los nodos de esa organización en el tenant
 */
export function buildTenantOrgPartitionKey(tenantId, organizationScopeId) {
  const t = normalizePartitionSegment(tenantId);
  const o = normalizeOrgScopeSegment(organizationScopeId);
  if (!t || !o) return "";
  return `TENANT#${t}#ORG#${o}`;
}

const NODE_TYPE_PREFIXES = [
  "ORGANIZATION",
  "REGION",
  "BRANCH",
  "BUILDING",
  "COST_CENTER",
  "ASSET",
  "METER"
];

/**
 * Devuelve el SK de parent (p. ej. REGION#abc). Si el cliente envía un puntero largo
 * (TENANT#...#REGION#abc), toma el prefijo a partir del primer tipo de nodo conocido.
 * @param {string | null | undefined} parentId
 * @returns {string}
 */
export function normalizeParentIdPointer(parentId) {
  if (parentId == null) return "ROOT";
  const s = String(parentId).trim();
  if (s === "" || s === "ROOT") return "ROOT";

  for (const t of NODE_TYPE_PREFIXES) {
    const idx = s.indexOf(`${t}#`);
    if (idx >= 0) {
      return s.slice(idx);
    }
  }

  return s;
}

/*
 * Nota migración: datos antiguos pueden tener PK `ORG#<uuid>` (sin prefijo TENANT).
 * No re-exportamos esa forma aquí para no mezclar convenciones; scripts ETL deben
 * mapear explícitamente ORG#… → TENANT#<tenantId>#ORG#<organizationScopeId>.
 */
