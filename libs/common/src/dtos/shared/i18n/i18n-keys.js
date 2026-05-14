import { EntityType } from './enums.js';
/**
 * Mapeo `EnergyServiceType` → clave i18n. Valor técnico inmutable, traducción en UI.
 * Exhaustividad garantizada por `Record<EnergyServiceType, ...>`.
 */
export const ENERGY_SERVICE_TYPE_I18N = Object.freeze({
    ELECTRICITY: 'ENERGY_SERVICE_TYPE.ELECTRICITY',
    GAS: 'ENERGY_SERVICE_TYPE.GAS',
    WATER: 'ENERGY_SERVICE_TYPE.WATER',
    STEAM: 'ENERGY_SERVICE_TYPE.STEAM'
});
export function getEnergyServiceTypeI18nKey(serviceType) {
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
export const ENTITY_TYPE_I18N = Object.freeze({
    [EntityType.ORGANIZATION]: 'ENTITIES.ORGANIZATION',
    [EntityType.BRANCH]: 'ENTITIES.BRANCH',
    [EntityType.BUILDING]: 'ENTITIES.BUILDING',
    [EntityType.METER]: 'ENTITIES.METER'
});
/**
 * Helper tipado — resuelve la clave i18n para un `EntityType` dado.
 * Útil cuando se necesita acceder al mapeo sin importar el objeto completo.
 */
export function getEntityTypeI18nKey(entityType) {
    return ENTITY_TYPE_I18N[entityType];
}
//# sourceMappingURL=i18n-keys.js.map