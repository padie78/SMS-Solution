import {
  ASSET_TYPE_TO_PERSISTENCE,
  METER_TYPE_TO_PERSISTENCE,
  type AssetType,
  type MeterType,
  type UserRole
} from './domain-enums.js';

export const ROLE_TO_CODE: Record<UserRole, string> = {
  ADMIN: 'ADM',
  MANAGER: 'MGR',
  VIEWER: 'VWR',
  BRANCH_ADMIN: 'BAD'
};

export function decodeAssetType(code: string): AssetType {
  const entry = Object.entries(ASSET_TYPE_TO_PERSISTENCE).find(([, v]) => v === code);
  if (!entry) throw new Error(`Unknown persisted asset type code: ${code}`);
  return entry[0] as AssetType;
}

export function decodeMeterType(code: string): MeterType {
  const entry = Object.entries(METER_TYPE_TO_PERSISTENCE).find(([, v]) => v === code);
  if (!entry) throw new Error(`Unknown persisted meter type code: ${code}`);
  return entry[0] as MeterType;
}

export function decodeRole(code: string): UserRole {
  const entry = Object.entries(ROLE_TO_CODE).find(([, v]) => v === code);
  if (!entry) throw new Error(`Unknown persisted user role code: ${code}`);
  return entry[0] as UserRole;
}
