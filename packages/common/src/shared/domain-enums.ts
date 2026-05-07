import { z } from 'zod';

/** Tipología de activos energéticos bajo Building. */
export const AssetTypeSchema = z.enum([
  'HVAC',
  'CHILLER',
  'MOTOR',
  'BOILER',
  'LIGHTING',
  'INDUSTRIAL_MACHINERY',
  'COMPRESSED_AIR'
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

export const ASSET_TYPE_TO_PERSISTENCE: Record<AssetType, string> = {
  HVAC: 'HVAC',
  CHILLER: 'CHLR',
  MOTOR: 'MOT',
  BOILER: 'BOIL',
  LIGHTING: 'LGT',
  INDUSTRIAL_MACHINERY: 'IND',
  COMPRESSED_AIR: 'CMP_AIR'
};

/** Tipología física del punto de medición. */
export const MeterTypeSchema = z.enum(['ELECTRICITY', 'WATER', 'GAS', 'THERMAL', 'BTU']);
export type MeterType = z.infer<typeof MeterTypeSchema>;

export const METER_TYPE_TO_PERSISTENCE: Record<MeterType, string> = {
  ELECTRICITY: 'ELEC',
  WATER: 'WATER',
  GAS: 'GAS',
  THERMAL: 'THERM',
  BTU: 'BTU'
};

/** Roles RBAC workspace SMS. */
export const UserRoleSchema = z.enum(['ADMIN', 'MANAGER', 'VIEWER', 'BRANCH_ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;
