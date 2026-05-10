/**
 * Single-table PK para nodos de jerarquía bajo multi-tenant Cognito.
 * Formato: `TENANT#<tenantId>#ORG#<organizationScopeId>`
 *
 * - `tenantId`: claim obligatorio `custom:tenant_id` (UUID o identificador estable).
 * - `organizationScopeId`: clave de partición lógica de la org (claims `custom:organization_id` /
 *   `custom:holding_id`, o fallback **ROOT-001** vía `resolvePartitionContextFromEvent` salvo
 *   **DEFAULT_ORGAN_SCOPE_ID** en Lambda).
 *
 * Todos los SK (p. ej. ORGANIZATION#..., REGION#...) comparten el mismo PK dentro de esa org.
 *
 * @param {string | undefined | null} raw
 * @returns {string} segmento alfanumérico sin prefijos ORG#/ORGANIZATION#
 */
export function normalizeOrgScopeSegment(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.includes("#")) {
    const parts = s.split("#").filter(Boolean);
    const last = parts[parts.length - 1];
    return last ? last.trim() : "";
  }
  return s;
}

/**
 * @param {string | undefined | null} tenantId
 * @param {string | undefined | null} organizationScopeId segmento ORG (misma convención que antes bajo ORG#)
 * @returns {string} PK DynamoDB para todos los nodos de esa organización en el tenant
 */
export function buildTenantOrgPartitionKey(tenantId, organizationScopeId) {
  const t = String(tenantId ?? "").trim();
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
