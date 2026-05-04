import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { EmissionFactorEntity } from './emission-factor.entity.js';
import type { EmissionFactorDTO } from './emission-factor.dto.js';

/** `saveEmissionFactor` no incluye `orgId`; `org_id` opcional para single-table. */
export interface EmissionFactorPersistence {
  sms_et: Extract<SmsEntityTag, 'EMF'>;
  org_id?: string;
  nm: string;
  yr: number;
  reg_cd: string;
  act_ty: string;
  unit: string;
  val: number;
  scope: string;
}

export const EmissionFactorMapper = Object.freeze({
  dtoToEntity(dto: EmissionFactorDTO): EmissionFactorEntity {
    return EmissionFactorEntity.fromDTO(dto);
  },

  toPersistence(
    entity: EmissionFactorEntity,
    orgId?: string
  ): EmissionFactorPersistence {
    return {
      sms_et: 'EMF',
      ...(orgId?.trim() ? { org_id: orgId } : {}),
      nm: entity.name,
      yr: entity.year,
      reg_cd: entity.regionCode,
      act_ty: entity.activityType,
      unit: entity.unit,
      val: entity.value,
      scope: entity.scope
    };
  },

  persistenceToDTO(row: EmissionFactorPersistence): EmissionFactorDTO {
    return {
      name: row.nm,
      year: row.yr,
      regionCode: row.reg_cd,
      activityType: row.act_ty as EmissionFactorDTO['activityType'],
      unit: row.unit as EmissionFactorDTO['unit'],
      value: row.val,
      scope: row.scope as EmissionFactorDTO['scope']
    };
  }
});
