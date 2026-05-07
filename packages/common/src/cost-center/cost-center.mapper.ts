import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import type { CostAllocationMethod, LifecycleStatus } from '../shared/graphql-setup-enums.js';
import type { CostCenterDTO } from './cost-center.dto.js';
import { CostCenterEntity } from './cost-center.entity.js';

export interface CostCenterPersistence {
  sms_et: SmsEntityTag;
  org_id: string;
  cc_id: string;
  cc_nm: string;
  br_id?: string;
  bld_id?: string;
  alloc_m: CostAllocationMethod;
  pct: number;
  ann_budg: number;
  curr: string;
  fy: number;
  ext_id?: string;
  st: LifecycleStatus;
  upd_at?: string;
}

export const CostCenterMapper = Object.freeze({
  dtoToEntity(dto: CostCenterDTO): CostCenterEntity {
    return CostCenterEntity.fromDTO(dto);
  },

  toPersistence(entity: CostCenterEntity): CostCenterPersistence {
    return {
      sms_et: 'CC',
      org_id: entity.organizationId,
      cc_id: entity.id,
      cc_nm: entity.name,
      alloc_m: entity.allocationMethod,
      pct: entity.percentage,
      ann_budg: entity.annualBudget,
      curr: entity.currency,
      fy: entity.fiscalYear,
      st: entity.status,
      ...(entity.branchId?.trim() ? { br_id: entity.branchId } : {}),
      ...(entity.buildingId?.trim() ? { bld_id: entity.buildingId } : {}),
      ...(entity.externalId?.trim() ? { ext_id: entity.externalId } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: CostCenterPersistence): CostCenterDTO {
    return {
      id: row.cc_id,
      organizationId: row.org_id,
      name: row.cc_nm,
      branchId: row.br_id,
      buildingId: row.bld_id,
      allocationMethod: row.alloc_m,
      percentage: row.pct,
      annualBudget: row.ann_budg,
      currency: row.curr,
      fiscalYear: row.fy,
      status: row.st,
      ...(row.ext_id ? { externalId: row.ext_id } : {}),
      ...(row.upd_at ? { updatedAt: row.upd_at } : {})
    };
  }
});
