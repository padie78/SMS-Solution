import { EntityType } from './enums.js';
import type { EnergyServiceType } from '../graphql-setup-enums.js';

/** Unión exacta de claves i18n válidas (autocomplete + safety en plantillas). */
export type EntityTypeI18nKey =
  | 'ENTITIES.ORGANIZATION'
  | 'ENTITIES.BRANCH'
  | 'ENTITIES.BUILDING'
  | 'ENTITIES.METER';

/** Claves i18n para tipos de servicio energético (consumo). */
export type EnergyServiceTypeI18nKey =
  | 'ENERGY_SERVICE_TYPE.ELECTRICITY'
  | 'ENERGY_SERVICE_TYPE.GAS'
  | 'ENERGY_SERVICE_TYPE.WATER'
  | 'ENERGY_SERVICE_TYPE.STEAM';

/**
 * Mapeo `EnergyServiceType` → clave i18n. Valor técnico inmutable, traducción en UI.
 * Exhaustividad garantizada por `Record<EnergyServiceType, ...>`.
 */
export const ENERGY_SERVICE_TYPE_I18N: Readonly<
  Record<EnergyServiceType, EnergyServiceTypeI18nKey>
> = Object.freeze({
  ELECTRICITY: 'ENERGY_SERVICE_TYPE.ELECTRICITY',
  GAS: 'ENERGY_SERVICE_TYPE.GAS',
  WATER: 'ENERGY_SERVICE_TYPE.WATER',
  STEAM: 'ENERGY_SERVICE_TYPE.STEAM'
});

export function getEnergyServiceTypeI18nKey(
  serviceType: EnergyServiceType
): EnergyServiceTypeI18nKey {
  return ENERGY_SERVICE_TYPE_I18N[serviceType];
}

/**
 * Mapeo `EntityType` → clave de traducción i18n.
 *
 * El tipado `Record<EntityType, EntityTypeI18nKey>` garantiza que TypeScript
 * falle en compilación si:
 *   - Se añade un nuevo `EntityType` y se olvida su key i18n (exhaustiveness).
 *   - Se usa una key que no existe en la unión declarada (typo-safe).
 *
 * Las claves siguen un esquema namespaced `<DOMAIN>.<KEY>` — ver es.json/en.json.
 */
export const ENTITY_TYPE_I18N: Readonly<Record<EntityType, EntityTypeI18nKey>> = Object.freeze({
  [EntityType.ORGANIZATION]: 'ENTITIES.ORGANIZATION',
  [EntityType.BRANCH]: 'ENTITIES.BRANCH',
  [EntityType.BUILDING]: 'ENTITIES.BUILDING',
  [EntityType.METER]: 'ENTITIES.METER'
});

/**
 * Helper tipado — resuelve la clave i18n para un `EntityType` dado.
 * Útil cuando se necesita acceder al mapeo sin importar el objeto completo.
 */
export function getEntityTypeI18nKey(entityType: EntityType): EntityTypeI18nKey {
  return ENTITY_TYPE_I18N[entityType];
}
