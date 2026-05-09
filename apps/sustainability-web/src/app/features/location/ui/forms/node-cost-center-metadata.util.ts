import type { SmsLocationNodeMetadata } from '../../../../core/models/sms-location-node.model';

/**
 * Clave canónica para la lista multi de Cost Centers asignados a un nodo
 * (Branch / Building / Asset / Meter), persistida en `metadata.custom`.
 */
export const NODE_COST_CENTER_IDS_CUSTOM_KEY = 'costCenterIds' as const;

/** Compat: clave legacy del primer fix single-asignación. */
export const NODE_COST_CENTER_ID_LEGACY_CUSTOM_KEY = 'costCenterId' as const;

/**
 * Lee los IDs de Cost Center asignados al nodo desde su metadata.
 * Estrategia de fallback (de canónico a legacy):
 *   1. `metadata.custom['costCenterIds']` como JSON string array.
 *   2. `metadata.custom['costCenterId']` (single asignación previa).
 *   3. `metadata.costCenterId` (DTO legacy embebido en metadata raíz).
 */
export function readNodeCostCenterIds(meta: SmsLocationNodeMetadata | undefined): string[] {
  if (!meta || typeof meta !== 'object') return [];

  const custom = (meta.custom ?? null) as Record<string, string> | null;

  const serialized = custom?.[NODE_COST_CENTER_IDS_CUSTOM_KEY];
  if (typeof serialized === 'string' && serialized.length > 0) {
    try {
      const parsed = JSON.parse(serialized) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => (typeof v === 'string' ? v.trim() : ''))
          .filter((v) => v.length > 0);
      }
    } catch {
      // fall through al legacy
    }
  }

  const legacySingleCustom = custom?.[NODE_COST_CENTER_ID_LEGACY_CUSTOM_KEY];
  if (typeof legacySingleCustom === 'string' && legacySingleCustom.trim().length > 0) {
    return [legacySingleCustom.trim()];
  }

  const legacyMetadataField = (meta as unknown as { costCenterId?: unknown }).costCenterId;
  if (typeof legacyMetadataField === 'string' && legacyMetadataField.trim().length > 0) {
    return [legacyMetadataField.trim()];
  }

  return [];
}

/**
 * Devuelve un `Record<string, string>` listo para asignarse a `metadata.custom`,
 * con los IDs del nodo serializados de forma canónica y limpiando claves legacy.
 *
 * - Si `ids` está vacío → elimina `costCenterIds` y `costCenterId` legacy del custom.
 * - Si `ids` tiene contenido → escribe `costCenterIds` (JSON) y limpia `costCenterId` legacy.
 *
 * Mantiene cualquier otra clave ad-hoc previa intacta.
 */
export function writeNodeCostCenterIdsCustom(
  previous: SmsLocationNodeMetadata['custom'] | undefined,
  ids: readonly string[]
): Record<string, string> {
  const next: Record<string, string> = { ...((previous as Record<string, string> | null) ?? {}) };
  delete next[NODE_COST_CENTER_ID_LEGACY_CUSTOM_KEY];
  const cleaned = sanitizeIds(ids);
  if (cleaned.length === 0) {
    delete next[NODE_COST_CENTER_IDS_CUSTOM_KEY];
  } else {
    next[NODE_COST_CENTER_IDS_CUSTOM_KEY] = JSON.stringify(cleaned);
  }
  return next;
}

/** Quita strings vacíos y duplicados, preservando orden. */
export function sanitizeIds(ids: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const v = (raw ?? '').toString().trim();
    if (v.length === 0) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}
