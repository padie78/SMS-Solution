import { EntityType } from './enums.js';
import type { EnergyServiceType } from '../graphql-setup-enums.js';
/** Unión exacta de claves i18n válidas (autocomplete + safety en plantillas). */
export type EntityTypeI18nKey = 'ENTITIES.ORGANIZATION' | 'ENTITIES.BRANCH' | 'ENTITIES.BUILDING' | 'ENTITIES.METER';
/** Claves i18n para tipos de servicio energético (consumo). */
export type EnergyServiceTypeI18nKey = 'ENERGY_SERVICE_TYPE.ELECTRICITY' | 'ENERGY_SERVICE_TYPE.GAS' | 'ENERGY_SERVICE_TYPE.WATER' | 'ENERGY_SERVICE_TYPE.STEAM';
/**
 * Mapeo `EnergyServiceType` → clave i18n. Valor técnico inmutable, traducción en UI.
 * Exhaustividad garantizada por `Record<EnergyServiceType, ...>`.
 */
export declare const ENERGY_SERVICE_TYPE_I18N: Readonly<Record<EnergyServiceType, EnergyServiceTypeI18nKey>>;
export declare function getEnergyServiceTypeI18nKey(serviceType: EnergyServiceType): EnergyServiceTypeI18nKey;
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
export declare const ENTITY_TYPE_I18N: Readonly<Record<EntityType, EntityTypeI18nKey>>;
/**
 * Helper tipado — resuelve la clave i18n para un `EntityType` dado.
 * Útil cuando se necesita acceder al mapeo sin importar el objeto completo.
 */
export declare function getEntityTypeI18nKey(entityType: EntityType): EntityTypeI18nKey;
//# sourceMappingURL=i18n-keys.d.ts.map