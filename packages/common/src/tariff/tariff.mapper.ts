import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import type { EnergyServiceType } from '../shared/graphql-setup-enums.js';
import { TariffEntity } from './tariff.entity.js';
import type { TariffDTO } from './tariff.dto.js';

export interface TariffPersistence {
  sms_et: Extract<SmsEntityTag, 'TRF'>;
  org_id: string;
  br_id: string;
  svc_ty: string;
  prov_nm: string;
  ctr_id: string;
  price_md: string;
  base_rt: number;
  vf: string;
  vt: string;
}

export const TariffMapper = Object.freeze({
  dtoToEntity(
    orgId: string,
    branchId: string,
    serviceType: EnergyServiceType,
    dto: TariffDTO
  ): TariffEntity {
    return TariffEntity.fromMutation(orgId, branchId, serviceType, dto);
  },

  toPersistence(entity: TariffEntity): TariffPersistence {
    return {
      sms_et: 'TRF',
      org_id: entity.orgId,
      br_id: entity.branchId,
      svc_ty: entity.serviceType,
      prov_nm: entity.providerName,
      ctr_id: entity.contractId,
      price_md: entity.pricingModel,
      base_rt: entity.baseRate,
      vf: entity.validFrom,
      vt: entity.validTo
    };
  },

  persistenceToDTO(row: TariffPersistence): TariffDTO {
    return {
      providerName: row.prov_nm,
      contractId: row.ctr_id,
      pricingModel: row.price_md as TariffDTO['pricingModel'],
      baseRate: row.base_rt,
      validFrom: row.vf,
      validTo: row.vt
    };
  }
});
