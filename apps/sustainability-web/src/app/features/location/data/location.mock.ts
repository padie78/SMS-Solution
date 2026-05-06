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
 * Mock mode: permite usar Location Manager sin backend.
 * Cambiar a `false` cuando estén los endpoints (API Gateway) listos.
 */
export const LOCATION_USE_MOCK = true;

export const LOCATION_MOCK_STORAGE_KEY = 'sms.location.manager.mock.v1';

