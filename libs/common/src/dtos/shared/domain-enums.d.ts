import { z } from 'zod';
/** Tipología de activos energéticos bajo Building. */
export declare const AssetTypeSchema: z.ZodEnum<["HVAC", "CHILLER", "MOTOR", "BOILER", "LIGHTING", "INDUSTRIAL_MACHINERY", "COMPRESSED_AIR"]>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
export declare const ASSET_TYPE_TO_PERSISTENCE: Record<AssetType, string>;
/** Tipología física del punto de medición. */
export declare const MeterTypeSchema: z.ZodEnum<["ELECTRICITY", "WATER", "GAS", "THERMAL", "BTU"]>;
export type MeterType = z.infer<typeof MeterTypeSchema>;
export declare const METER_TYPE_TO_PERSISTENCE: Record<MeterType, string>;
/** Roles RBAC workspace SMS. */
export declare const UserRoleSchema: z.ZodEnum<["ADMIN", "MANAGER", "VIEWER", "BRANCH_ADMIN"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
//# sourceMappingURL=domain-enums.d.ts.map