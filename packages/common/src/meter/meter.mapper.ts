import { METER_TYPE_TO_PERSISTENCE } from '../shared/domain-enums.js';
import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { decodeMeterType } from '../shared/persistence-codecs.js';
import { MeterEntity } from './meter.entity.js';
import type { MeterDTO } from './meter.dto.js';
import type { MeterOperationalStatus } from '../shared/graphql-setup-enums.js';

export interface MeterPersistence {
  sms_et: SmsEntityTag;
  met_id: string;
  org_id: string;
  reg_id: string;
  br_id: string;
  bld_id: string;
  met_ty: string;
  sn: string;
  met_nm: string;
  iot_nm: string;
  prot: string;
  main?: boolean;
  ast_id?: string;
  par_met_id?: string;
  st?: MeterOperationalStatus;
  crt_at?: string;
  upd_at?: string;
}

function decodeMeterStatus(raw: string | undefined): MeterDTO['status'] {
  if (!raw) return 'ACTIVE';
  const u = raw.toUpperCase();
  if (u === 'PROVISIONED') return 'ACTIVE';
  if (u === 'ACTIVE' || u === 'INACTIVE' || u === 'FAULT') return u as MeterDTO['status'];
  return 'ACTIVE';
}

export const MeterMapper = Object.freeze({
  dtoToEntity(dto: MeterDTO): MeterEntity {
    return MeterEntity.fromDTO(dto);
  },

  toPersistence(entity: MeterEntity): MeterPersistence {
    return {
      sms_et: 'MET',
      met_id: entity.id,
      org_id: entity.orgId,
      reg_id: entity.regionId,
      br_id: entity.branchId,
      bld_id: entity.buildingId,
      met_ty: METER_TYPE_TO_PERSISTENCE[entity.meterType],
      sn: entity.serialNumber,
      met_nm: entity.name,
      iot_nm: entity.iotName,
      prot: entity.protocol,
      st: entity.status,
      ...(entity.isMain ? { main: true } : {}),
      ...(entity.assetId?.trim() ? { ast_id: entity.assetId } : {}),
      ...(entity.parentMeterId?.trim() ? { par_met_id: entity.parentMeterId } : {}),
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: MeterPersistence): MeterDTO {
    return {
      id: row.met_id,
      orgId: row.org_id,
      regionId: row.reg_id,
      branchId: row.br_id,
      buildingId: row.bld_id,
      meterType: decodeMeterType(row.met_ty),
      serialNumber: row.sn ?? '',
      name: row.met_nm ?? '',
      iotName: row.iot_nm ?? '',
      protocol: row.prot as MeterDTO['protocol'],
      status: decodeMeterStatus(row.st),
      isMain: Boolean(row.main),
      assetId: row.ast_id,
      parentMeterId: row.par_met_id,
      ...(row.crt_at ? { createdAt: row.crt_at } : {}),
      ...(row.upd_at ? { updatedAt: row.upd_at } : {})
    };
  }
});
