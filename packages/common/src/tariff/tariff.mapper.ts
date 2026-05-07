import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import type { EnergyServiceType } from '../shared/graphql-setup-enums.js';
import { TariffEntity } from './tariff.entity.js';
import type { TariffDTO } from './tariff.dto.js';

function generateTariffFallbackId(row: Pick<TariffPersistence, 'vf' | 'ctr_id' | 'br_id'>): string {
  return `trf_${row.br_id}_${row.ctr_id}_${row.vf}`;
}

export interface TariffPersistence {
  sms_et: Extract<SmsEntityTag, 'TRF'>;
  trf_id?: string;
  org_id: string;
  br_id: string;
  bld_id?: string;
  svc_ty: string;
  prov_nm: string;
  ctr_id: string;
  price_md: string;
  base_rt: number;
  curr: string;
  vf: string;
  vt: string;
  st?: TariffDTO['status'];
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
      trf_id: entity.id,
      org_id: entity.orgId,
      br_id: entity.branchId,
      svc_ty: entity.serviceType,
      prov_nm: entity.providerName,
      ctr_id: entity.contractId,
      price_md: entity.pricingModel,
      base_rt: entity.baseRate,
      curr: entity.currency,
      vf: entity.validFrom,
      vt: entity.validTo,
      st: entity.status,
      ...(entity.buildingId?.trim() ? { bld_id: entity.buildingId } : {})
    };
  },

  persistenceToDTO(row: TariffPersistence): TariffDTO {
    return {
      id: row.trf_id || generateTariffFallbackId(row),
      orgId: row.org_id,
      branchId: row.br_id,
      serviceType: row.svc_ty as TariffDTO['serviceType'],
      providerName: row.prov_nm,
      contractId: row.ctr_id,
      pricingModel: row.price_md as TariffDTO['pricingModel'],
      baseRate: row.base_rt,
      currency: row.curr,
      validFrom: row.vf,
      validTo: row.vt,
      status: row.st ?? 'ACTIVE',
      ...(row.bld_id ? { buildingId: row.bld_id } : {})
    };
  }
});
