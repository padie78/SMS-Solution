import { z } from 'zod';
/**
 * Tipo de entidad jerárquica del SMS (single-table design).
 * Valor técnico inmutable → se persiste en DynamoDB y viaja en payloads API.
 * NUNCA traducir este valor: la traducción ocurre en la capa de presentación
 * vía `ENTITY_TYPE_I18N` + `TranslateService`.
 *
 * Patrón `as const` (no `enum` TS) por compatibilidad con `isolatedModules`,
 * tree-shaking y consistencia con el resto del paquete `@sms/common`.
 */
export const EntityType = {
    ORGANIZATION: 'ORGANIZATION',
    BRANCH: 'BRANCH',
    BUILDING: 'BUILDING',
    METER: 'METER'
};
/** Schema Zod runtime — usar en bordes API/Lambda para rechazar payloads inválidos. */
export const EntityTypeSchema = z.enum([
    EntityType.ORGANIZATION,
    EntityType.BRANCH,
    EntityType.BUILDING,
    EntityType.METER
]);
/** Lista inmutable de valores — útil para iterar en dropdowns Angular. */
export const ENTITY_TYPE_VALUES = Object.freeze([
    EntityType.ORGANIZATION,
    EntityType.BRANCH,
    EntityType.BUILDING,
    EntityType.METER
]);
/** Type guard runtime-safe (frontend defensivo). */
export function isEntityType(value) {
    return EntityTypeSchema.safeParse(value).success;
}
//# sourceMappingURL=enums.js.map