import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { CostCenterEntity } from './cost-center.entity.js';
import type { CostCenterDTO } from './cost-center.dto.js';

export interface CostCenterPersistence {
  sms_et: SmsEntityTag;
  cc_id: string;
  cc_nm: string;
  br_id?: string;
  bld_id?: string;
  alloc_m?: string;
  pct?: number;
  ann_budg?: number;
}

export const CostCenterMapper = Object.freeze({
  dtoToEntity(dto: CostCenterDTO): CostCenterEntity {
    return CostCenterEntity.fromDTO(dto);
  },

  toPersistence(entity: CostCenterEntity): CostCenterPersistence {
    return {
      sms_et: 'CC',
      cc_id: entity.id,
      cc_nm: entity.name,
      ...(entity.branchId?.trim() ? { br_id: entity.branchId } : {}),
      ...(entity.buildingId?.trim() ? { bld_id: entity.buildingId } : {}),
      ...(entity.allocationMethod?.trim() ? { alloc_m: entity.allocationMethod } : {}),
      ...(entity.percentage !== undefined ? { pct: entity.percentage } : {}),
      ...(entity.annualBudget !== undefined ? { ann_budg: entity.annualBudget } : {})
    };
  },

  persistenceToDTO(row: CostCenterPersistence): CostCenterDTO {
    return {
      id: row.cc_id,
      name: row.cc_nm,
      branchId: row.br_id,
      buildingId: row.bld_id,
      allocationMethod: row.alloc_m as CostCenterDTO['allocationMethod'],
      percentage: row.pct,
      annualBudget: row.ann_budg
    };
  }
});
