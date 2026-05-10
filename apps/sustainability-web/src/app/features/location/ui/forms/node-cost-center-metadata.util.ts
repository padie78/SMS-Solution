import type { SmsLocationNodeMetadata } from '../../../../core/models/sms-location-node.model';

/**
 * Legacy: IDs serializados en `metadata.custom['costCenterIds']` (string JSON).
 * Canónico: `metadata.costCenterIds` (array nativo).
 */
export const NODE_COST_CENTER_IDS_CUSTOM_KEY = 'costCenterIds' as const;

/** Compat: clave legacy del primer fix single-asignación. */
export const NODE_COST_CENTER_ID_LEGACY_CUSTOM_KEY = 'costCenterId' as const;

/**
 * Lee los IDs de Cost Center asignados al nodo desde su metadata.
 * Orden: `metadata.costCenterIds` (nativo) → custom JSON string → legados.
 */
export function readNodeCostCenterIds(meta: SmsLocationNodeMetadata | undefined): string[] {
  if (!meta || typeof meta !== 'object') return [];

  const top = (meta as { costCenterIds?: unknown }).costCenterIds;
  if (Array.isArray(top)) {
    return top
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v) => v.length > 0);
  }

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
 * Persistencia canónica: escribe `metadata.costCenterIds` como array y elimina las claves
 * legacy en `custom` que guardaban el mismo dato como string JSON.
 */
export function patchNodeCostCenterIdsOnMetadata(
  previousMeta: SmsLocationNodeMetadata | undefined,
  ids: readonly string[]
): Pick<SmsLocationNodeMetadata, 'custom' | 'costCenterIds'> {
  const cleaned = sanitizeIds(ids);
  const previousCustom = (previousMeta?.custom ?? null) as Record<string, string> | null;
  const nextCustom: Record<string, string> = { ...(previousCustom ?? {}) };
  delete nextCustom[NODE_COST_CENTER_IDS_CUSTOM_KEY];
  delete nextCustom[NODE_COST_CENTER_ID_LEGACY_CUSTOM_KEY];
  return {
    costCenterIds: cleaned,
    custom: Object.keys(nextCustom).length > 0 ? nextCustom : null
  };
}

/**
 * @deprecated Usar `patchNodeCostCenterIdsOnMetadata` (array nativo en `metadata.costCenterIds`).
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
