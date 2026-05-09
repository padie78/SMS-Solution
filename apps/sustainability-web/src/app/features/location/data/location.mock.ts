import type { SmsLocationNode } from '../../../core/models/sms-location-node.model';

export interface LocationsListResponse {
  readonly items: SmsLocationNode[];
}

export interface LocationCreateRequest {
  readonly parent_id?: string | null;
  readonly type: SmsLocationNode['type'];
  readonly name: string;
  readonly status?: SmsLocationNode['status'];
  readonly metadata?: SmsLocationNode['metadata'];
}

export type LocationPatchRequest = Partial<
  Pick<SmsLocationNode, 'name' | 'status' | 'metadata' | 'consumption_data' | 'environmental_impact'>
>;

export interface ParentPatchRequest {
  readonly parent_id: string | null;
}

export const LOCATION_API_BASE_URL = '/locations';

/**
 * - `false` (recomendado): persiste en AppSync (`getTree`, `saveNode`, …). No escribe en localStorage.
 * - `true`: árbol solo en memoria + `localStorage` (`sms.location.manager.mock.v1`) para desarrollo sin API.
 */
export const LOCATION_USE_MOCK = false;

export const LOCATION_MOCK_STORAGE_KEY = 'sms.location.manager.mock.v1';

