import { ASSET_TYPE_TO_PERSISTENCE, MeterTypeSchema, METER_TYPE_TO_PERSISTENCE } from './domain-enums.js';
export const ROLE_TO_CODE = {
    ADMIN: 'ADM',
    MANAGER: 'MGR',
    VIEWER: 'VWR',
    BRANCH_ADMIN: 'BAD'
};
export function decodeAssetType(code) {
    const entry = Object.entries(ASSET_TYPE_TO_PERSISTENCE).find(([, v]) => v === code);
    if (!entry)
        throw new Error(`Unknown persisted asset type code: ${code}`);
    return entry[0];
}
export function decodeMeterType(code) {
    if (!code?.trim())
        return 'ELECTRICITY';
    const c = code.trim();
    const hit = Object.entries(METER_TYPE_TO_PERSISTENCE).find(([, v]) => v === c);
    if (hit)
        return hit[0];
    const parsed = MeterTypeSchema.safeParse(c);
    return parsed.success ? parsed.data : 'ELECTRICITY';
}
export function decodeRole(code) {
    const entry = Object.entries(ROLE_TO_CODE).find(([, v]) => v === code);
    if (!entry)
        throw new Error(`Unknown persisted user role code: ${code}`);
    return entry[0];
}
//# sourceMappingURL=persistence-codecs.js.map