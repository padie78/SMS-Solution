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
export const ASSET_TYPE_TO_PERSISTENCE = {
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
export const METER_TYPE_TO_PERSISTENCE = {
    ELECTRICITY: 'ELEC',
    WATER: 'WATER',
    GAS: 'GAS',
    THERMAL: 'THERM',
    BTU: 'BTU'
};
/** Roles RBAC workspace SMS. */
export const UserRoleSchema = z.enum(['ADMIN', 'MANAGER', 'VIEWER', 'BRANCH_ADMIN']);
//# sourceMappingURL=domain-enums.js.map