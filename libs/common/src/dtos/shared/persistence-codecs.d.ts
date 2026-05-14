import { type AssetType, type MeterType, type UserRole } from './domain-enums.js';
export declare const ROLE_TO_CODE: Record<UserRole, string>;
export declare function decodeAssetType(code: string): AssetType;
export declare function decodeMeterType(code: string): MeterType;
export declare function decodeRole(code: string): UserRole;
//# sourceMappingURL=persistence-codecs.d.ts.map