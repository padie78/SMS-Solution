import { METER_TYPE_TO_PERSISTENCE } from '../shared/domain-enums.js';
import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { decodeMeterType } from '../shared/persistence-codecs.js';
import { MeterEntity } from './meter.entity.js';
import type { MeterDTO } from './meter.dto.js';

export interface MeterPersistence {
  sms_et: SmsEntityTag;
  met_id: string;
  bld_id: string;
  br_id?: string;
  met_ty: string;
  ast_id?: string;
  sn?: string;
  met_nm?: string;
  iot_nm?: string;
  prot?: string;
  main?: boolean;
}

export const MeterMapper = Object.freeze({
  dtoToEntity(dto: MeterDTO): MeterEntity {
    return MeterEntity.fromDTO(dto);
  },

  toPersistence(entity: MeterEntity): MeterPersistence {
    return {
      sms_et: 'MET',
      met_id: entity.id,
      bld_id: entity.buildingId,
      met_ty: METER_TYPE_TO_PERSISTENCE[entity.meterType],
      ...(entity.branchId?.trim() ? { br_id: entity.branchId } : {}),
      ...(entity.assetId?.trim() ? { ast_id: entity.assetId } : {}),
      ...(entity.serialNumber?.trim() ? { sn: entity.serialNumber } : {}),
      ...(entity.name?.trim() ? { met_nm: entity.name } : {}),
      ...(entity.iotName?.trim() ? { iot_nm: entity.iotName } : {}),
      ...(entity.protocol ? { prot: entity.protocol } : {}),
      ...(entity.isMain !== undefined ? { main: entity.isMain } : {})
    };
  },

  persistenceToDTO(row: MeterPersistence): MeterDTO {
    return {
      id: row.met_id,
      buildingId: row.bld_id,
      branchId: row.br_id,
      meterType: decodeMeterType(row.met_ty),
      assetId: row.ast_id,
      serialNumber: row.sn,
      name: row.met_nm,
      iotName: row.iot_nm,
      protocol: row.prot as MeterDTO['protocol'],
      isMain: row.main
    };
  }
});
