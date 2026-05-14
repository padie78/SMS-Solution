/**
 * Barrel i18n SMS — fuente única de verdad para tipos de entidad y sus
 * claves de traducción. Consumido por:
 *   - apps/sustainability-web (Angular + ngx-translate)
 *   - lambda_code/api_lambda  (validación Zod previa a DynamoDB)
 *
 * Re-exportado desde `@sms/common`.
 */
export { EntityType, EntityTypeSchema, ENTITY_TYPE_VALUES, isEntityType } from './enums.js';
export { ENTITY_TYPE_I18N, getEntityTypeI18nKey, ENERGY_SERVICE_TYPE_I18N, getEnergyServiceTypeI18nKey, type EntityTypeI18nKey, type EnergyServiceTypeI18nKey } from './i18n-keys.js';
//# sourceMappingURL=index.d.ts.map