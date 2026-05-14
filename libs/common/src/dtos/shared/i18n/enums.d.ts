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
export declare const EntityType: {
    readonly ORGANIZATION: "ORGANIZATION";
    readonly BRANCH: "BRANCH";
    readonly BUILDING: "BUILDING";
    readonly METER: "METER";
};
export type EntityType = (typeof EntityType)[keyof typeof EntityType];
/** Schema Zod runtime — usar en bordes API/Lambda para rechazar payloads inválidos. */
export declare const EntityTypeSchema: z.ZodEnum<["ORGANIZATION", "BRANCH", "BUILDING", "METER"]>;
/** Lista inmutable de valores — útil para iterar en dropdowns Angular. */
export declare const ENTITY_TYPE_VALUES: ReadonlyArray<EntityType>;
/** Type guard runtime-safe (frontend defensivo). */
export declare function isEntityType(value: unknown): value is EntityType;
//# sourceMappingURL=enums.d.ts.map