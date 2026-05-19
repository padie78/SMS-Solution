import {
  ASSET_TYPE_TO_PERSISTENCE,
  MeterTypeSchema,
  METER_TYPE_TO_PERSISTENCE,
  type AssetType,
  type MeterType,
  type UserRole
} from './domain-enums';

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
  if (!code?.trim()) return 'ELECTRICITY';
  const c = code.trim();
  const hit = Object.entries(METER_TYPE_TO_PERSISTENCE).find(([, v]) => v === c);
  if (hit) return hit[0] as MeterType;
  const parsed = MeterTypeSchema.safeParse(c);
  return parsed.success ? parsed.data : 'ELECTRICITY';
}

export function decodeRole(code: string): UserRole {
  const entry = Object.entries(ROLE_TO_CODE).find(([, v]) => v === code);
  if (!entry) throw new Error(`Unknown persisted user role code: ${code}`);
  return entry[0] as UserRole;
}
