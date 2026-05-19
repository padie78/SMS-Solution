import type { TenancyContext } from './entities/single-table-record.entity.js';
import { SingleTableEntityType } from './entity-type.constants.js';

/** PK canónica SaaS: aislamiento por tenant y organización. */
export function buildTenantOrgPartitionKey(ctx: TenancyContext): string {
  const t = ctx.tenantId.trim();
  const o = ctx.orgId.trim();
  if (!t || !o) {
    throw new Error('TenancyContext requires non-empty tenantId and orgId');
  }
  return `TENANT#${t}#ORG#${o}`;
}

/**
 * SK canónica: prefijo de entidad + identificador opaco.
 * @param entityPrefix p.ej. `INV`, `SITE`, `USER` (sin el símbolo `#` final).
 */
export function buildEntitySortKey(entityPrefix: string, entityId: string): string {
  const p = entityPrefix.trim().toUpperCase();
  const id = entityId.trim();
  if (!p || !id) {
    throw new Error('buildEntitySortKey requires non-empty entityPrefix and entityId');
  }
  if (p.includes('#')) {
    throw new Error('entityPrefix must not contain #');
  }
  return `${p}#${id}`;
}

/** Extrae el id local desde una SK `PREFIX#id`. */
export function parseEntityIdFromSortKey(sortKey: string): { prefix: string; id: string } {
  const idx = sortKey.indexOf('#');
  if (idx <= 0 || idx === sortKey.length - 1) {
    throw new Error(`Invalid sort key format: ${sortKey}`);
  }
  return { prefix: sortKey.slice(0, idx), id: sortKey.slice(idx + 1) };
}

/** SK estable para logs de producción (debe coincidir con `ProductionLogSingleTableMapper`). */
export function buildProductionLogSortKey(branchId: string, period: string): string {
  return buildEntitySortKey(
    SingleTableEntityType.PRODUCTION_LOG,
    `${branchId.trim()}::${encodeURIComponent(period.trim())}`
  );
}
