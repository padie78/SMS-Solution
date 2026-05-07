import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { RegionEntity } from './region.entity.js';
import type { RegionDTO } from './region.dto.js';
import type { LifecycleStatus } from '../shared/graphql-setup-enums.js';

export interface RegionPersistence {
  sms_et: SmsEntityTag;
  org_id: string;
  reg_id: string;
  reg_nm: string;
  reg_cd: string;
  ctry_cd: string;
  tz: string;
  st: LifecycleStatus;
  dsc?: string;
  crd_lat?: number;
  crd_lng?: number;
  crt_at?: string;
  upd_at?: string;
}

export const RegionMapper = Object.freeze({
  dtoToEntity(dto: RegionDTO): RegionEntity {
    return RegionEntity.fromDTO(dto);
  },

  toPersistence(entity: RegionEntity): RegionPersistence {
    const coords = entity.coordinates;
    return {
      sms_et: 'REG',
      org_id: entity.organizationId,
      reg_id: entity.id,
      reg_nm: entity.name,
      reg_cd: entity.code,
      ctry_cd: entity.countryCode,
      tz: entity.timezone,
      st: entity.status,
      ...(entity.description?.trim() ? { dsc: entity.description } : {}),
      ...(coords !== undefined ? { crd_lat: coords.lat, crd_lng: coords.lng } : {}),
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: RegionPersistence): RegionDTO {
    const hasCoords = row.crd_lat !== undefined && row.crd_lng !== undefined;
    return {
      id: row.reg_id,
      organizationId: row.org_id,
      name: row.reg_nm,
      code: row.reg_cd,
      countryCode: row.ctry_cd,
      timezone: row.tz,
      status: row.st,
      ...(row.dsc ? { description: row.dsc } : {}),
      ...(hasCoords ? { coordinates: { lat: row.crd_lat as number, lng: row.crd_lng as number } } : {}),
      ...(row.crt_at ? { createdAt: row.crt_at } : {}),
      ...(row.upd_at ? { updatedAt: row.upd_at } : {})
    };
  }
});
