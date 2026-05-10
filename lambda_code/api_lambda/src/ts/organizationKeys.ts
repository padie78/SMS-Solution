/**
 * Tipado + helpers de llaves (alineado con runtime `tenantPartitionPk.js`).
 * PK/SK en MAYÚSCULAS para búsquedas consistentes.
 */

export function normalizePartitionSegment(raw: string | undefined | null): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}

export function normalizeOrgScopeSegment(raw: string | undefined | null): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.includes("#")) {
    const parts = s.split("#").filter(Boolean);
    const last = parts[parts.length - 1];
    return last ? normalizePartitionSegment(last) : "";
  }
  return normalizePartitionSegment(s);
}

export function buildTenantOrgPartitionKey(
  tenantId: string | undefined | null,
  organizationScopeId: string | undefined | null
): string {
  const t = normalizePartitionSegment(tenantId);
  const o = normalizeOrgScopeSegment(organizationScopeId);
  if (!t || !o) return "";
  return `TENANT#${t}#ORG#${o}`;
}
