import { METER_TYPE_TO_PERSISTENCE } from '@sms/contracts';
import { decodeMeterType } from '@sms/contracts';
import type { MeterType } from '@sms/contracts';
import type { SmsEntityTag } from '@sms/contracts';
import { MeterEntity } from '@sms/domain';
import type { MeterProtocol } from '@sms/contracts';
import type { MeterOperationalStatus } from '@sms/contracts';
import { MeterProtocolSchema } from '@sms/contracts';
import {
  MeterDTO,
  MeterCommunicationStatusSchema,
  MeterServiceTypeSchema,
  MeterUnitSchema,
  MeterAccuracyClassSchema
} from '@sms/contracts';

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
  /** Legacy / connectors (nombre cosa IoT). */
  iot_nm?: string;
  /** Enterprise: etiqueta inventario físico */
  ast_tag?: string;

  svc_ty?: string;
  unit?: string;
  acc_cls?: string;
  mult?: number;
  log_iv?: number;
  tz?: string;
  net_met?: boolean;
  lvl?: number;

  prot: string;
  main?: boolean;
  ast_id?: string;
  par_met_id?: string;
  st?: MeterOperationalStatus | string;
  comm_st?: string;
  last_cal?: string;
  next_cal?: string;
  pwr_qual?: boolean;
  log_mem?: boolean;
  seal_num?: string;
  phys_addr?: string;
  fw_ver?: string;
  virt?: boolean;
  vfmla?: string;

  tags?: Record<string, string>;
  crt_at?: string;
  upd_at?: string;
}

function decodeMeterStatus(raw: string | undefined): MeterOperationalStatus {
  if (!raw) return 'ACTIVE';
  const u = raw.toUpperCase();
  if (u === 'PROVISIONED') return 'ACTIVE';
  if (u === 'ACTIVE' || u === 'INACTIVE' || u === 'FAULT') return u as MeterOperationalStatus;
  return 'ACTIVE';
}

function safeDecodeProtocol(raw: string | undefined): MeterProtocol {
  if (!raw?.trim()) return 'MQTT';
  const t = raw.trim();
  const p = MeterProtocolSchema.safeParse(t);
  if (p.success) return p.data;
  const up = t.toUpperCase().replace(/-/g, '_');
  if (up === 'M_BUS' || up === 'MBUS') return 'M_BUS';
  return 'MQTT';
}

function defaultMeterUnit(meterType: MeterType): MeterDTO['unit'] {
  switch (meterType) {
    case 'WATER':
      return 'M3';
    case 'GAS':
      return 'M3';
    case 'THERMAL':
      return 'GJ';
    case 'BTU':
      return 'BTU';
    default:
      return 'KWH';
  }
}

export const MeterMapper = Object.freeze({
  dtoToEntity(dto: MeterDTO): MeterEntity {
    return MeterEntity.fromDTO(dto);
  },

  toPersistence(entity: MeterEntity): MeterPersistence {
    const tg = entity.tags && Object.keys(entity.tags).length > 0 ? { ...entity.tags } : undefined;
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
      iot_nm: entity.internalTag?.trim()
        ? entity.internalTag.trim()
        : `MTR_${entity.id.replace(/#/g, '_')}`,
      ast_tag: entity.internalTag,
      svc_ty: entity.serviceType,
      unit: entity.unit,
      acc_cls: entity.accuracyClass,
      mult: entity.multiplier,
      log_iv: entity.loggingIntervalMinutes,
      tz: entity.timeZone,
      net_met: entity.isNetMetering,
      lvl: entity.meterLevel,
      prot: entity.protocol,
      st: entity.status,
      comm_st: entity.communicationStatus,
      ...(entity.lastCalibrationDate ? { last_cal: entity.lastCalibrationDate } : {}),
      ...(entity.nextCalibrationDate ? { next_cal: entity.nextCalibrationDate } : {}),
      pwr_qual: entity.monitorsPowerQuality,
      log_mem: entity.hasDataLogging,
      ...(entity.metrologicalSealNumber ? { seal_num: entity.metrologicalSealNumber } : {}),
      ...(entity.physicalAddress ? { phys_addr: entity.physicalAddress } : {}),
      ...(entity.firmwareVersion ? { fw_ver: entity.firmwareVersion } : {}),
      virt: entity.isVirtual,
      ...(entity.virtualFormula ? { vfmla: entity.virtualFormula } : {}),
      ...(entity.isMain ? { main: true } : {}),
      ...(entity.assetId?.trim() ? { ast_id: entity.assetId } : {}),
      ...(entity.parentMeterId?.trim() ? { par_met_id: entity.parentMeterId } : {}),
      ...(tg !== undefined ? { tags: tg } : {}),
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: MeterPersistence): MeterDTO {
    const meterType = decodeMeterType(row.met_ty);
    const parsedUnit = row.unit !== undefined ? MeterUnitSchema.safeParse(row.unit.trim()) : { success: false as const };

    const commRaw = row.comm_st?.trim() ?? '';
    const commParsed = MeterCommunicationStatusSchema.safeParse(commRaw);
    const comm: MeterDTO['communicationStatus'] = commParsed.success ? commParsed.data : 'ONLINE';

    const internalTag = row.ast_tag?.trim()
      ? row.ast_tag.trim()
      : row.iot_nm?.trim()
        ? row.iot_nm.trim()
        : undefined;

    const svcParsed =
      row.svc_ty !== undefined ? MeterServiceTypeSchema.safeParse(row.svc_ty.trim()) : { success: false as const };
    const serviceType: MeterDTO['serviceType'] = svcParsed.success ? svcParsed.data : 'SUBMETERING';

    const accParsed =
      row.acc_cls !== undefined ? MeterAccuracyClassSchema.safeParse(row.acc_cls) : { success: false as const };
    const accuracyClass: MeterDTO['accuracyClass'] = accParsed.success ? accParsed.data : '1.0';

    return new MeterDTO(
      row.met_id,
      row.org_id,
      row.reg_id,
      row.br_id,
      row.bld_id,
      row.met_nm?.trim() ? row.met_nm : 'Unnamed meter',
      row.sn?.trim() ? row.sn : 'SN-UNKNOWN',
      internalTag,
      meterType,
      serviceType,
      parsedUnit.success ? parsedUnit.data : defaultMeterUnit(meterType),
      accuracyClass,
      row.mult ?? 1,
      row.log_iv ?? 15,
      row.tz ?? 'UTC',
      Boolean(row.main),
      Boolean(row.net_met),
      row.lvl ?? (row.main ? 1 : 2),
      row.par_met_id,
      row.ast_id,
      decodeMeterStatus(row.st),
      comm,
      row.last_cal,
      row.next_cal,
      row.pwr_qual ?? false,
      row.log_mem ?? false,
      row.seal_num,
      safeDecodeProtocol(row.prot),
      row.phys_addr,
      row.fw_ver,
      row.virt ?? false,
      row.vfmla,
      row.tags ?? {},
      row.crt_at,
      row.upd_at
    );
  }
});
