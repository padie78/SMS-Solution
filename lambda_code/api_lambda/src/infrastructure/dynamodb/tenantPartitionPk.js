/**
 * Clave de partición tenant en single-table Dynamo (`PK`) y valor del atributo `holdingId`
 * (hash key de `GSI_NodePath`). Convención del proyecto: ambas son la misma cadena `ORG#<id>`.
 *
 * @param {string | undefined | null} scopeRaw UUID, `sub`, o ya normalizado `ORG#...`
 * @returns {string} p.ej. `ORG#f3d4f8a2-90c1-708c-a446-2c8592524d62`
 */
export function tenantPartitionPk(scopeRaw) {
  const s = String(scopeRaw ?? "").trim();
  if (!s) return "";
  return s.startsWith("ORG#") ? s : `ORG#${s}`;
}
