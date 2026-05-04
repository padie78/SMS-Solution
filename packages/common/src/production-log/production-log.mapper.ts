import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { ProductionLogEntity } from './production-log.entity.js';
import type { ProductionLogDTO } from './production-log.dto.js';

export interface ProductionLogPersistence {
  sms_et: Extract<SmsEntityTag, 'PLOG'>;
  org_id: string;
  br_id: string;
  period: string;
  units: number;
  unit_ty: string;
  shift_md: string;
  eff: number;
  act_lines: number;
}

export const ProductionLogMapper = Object.freeze({
  dtoToEntity(
    orgId: string,
    branchId: string,
    period: string,
    dto: ProductionLogDTO
  ): ProductionLogEntity {
    return ProductionLogEntity.fromMutation(orgId, branchId, period, dto);
  },

  toPersistence(entity: ProductionLogEntity): ProductionLogPersistence {
    return {
      sms_et: 'PLOG',
      org_id: entity.orgId,
      br_id: entity.branchId,
      period: entity.period,
      units: entity.units,
      unit_ty: entity.unitType,
      shift_md: entity.shiftMode,
      eff: entity.efficiency,
      act_lines: entity.activeLines
    };
  },

  persistenceToDTO(row: ProductionLogPersistence): ProductionLogDTO {
    return {
      units: row.units,
      unitType: row.unit_ty as ProductionLogDTO['unitType'],
      shiftMode: row.shift_md as ProductionLogDTO['shiftMode'],
      efficiency: row.eff,
      activeLines: row.act_lines
    };
  }
});
