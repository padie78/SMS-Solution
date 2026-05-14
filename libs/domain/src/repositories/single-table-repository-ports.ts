import type { InvoiceDTO } from '@sms/common';
import type { AlertRuleEntity } from '../entities/alert-rule/alert-rule.entity.js';
import type { AssetEntity } from '../entities/asset/asset.entity.js';
import type { BranchEntity } from '../entities/branch/branch.entity.js';
import type { BuildingEntity } from '../entities/building/building.entity.js';
import type { CostCenterEntity } from '../entities/cost-center/cost-center.entity.js';
import type { EmissionFactorEntity } from '../entities/emission-factor/emission-factor.entity.js';
import type { InvoiceEntity } from '../entities/invoice/invoice.entity.js';
import type { MeterEntity } from '../entities/meter/meter.entity.js';
import type { OrgConfigEntity } from '../entities/org-config/org-config.entity.js';
import type { ProductionLogEntity } from '../entities/production-log/production-log.entity.js';
import type { RegionEntity } from '../entities/region/region.entity.js';
import type { TariffEntity } from '../entities/tariff/tariff.entity.js';
import type { UserEntity } from '../entities/user/user.entity.js';
import type { SingleTableWriteContext, TenantOrgContext } from './write-context.js';

export interface IRegionRepository {
  getById(ctx: TenantOrgContext, regionId: string): Promise<RegionEntity | null>;
  put(entity: RegionEntity, write: SingleTableWriteContext): Promise<void>;
  deleteById(ctx: TenantOrgContext, regionId: string): Promise<void>;
}

export interface IBranchRepository {
  getById(ctx: TenantOrgContext, branchId: string): Promise<BranchEntity | null>;
  put(entity: BranchEntity, write: SingleTableWriteContext): Promise<void>;
  deleteById(ctx: TenantOrgContext, branchId: string): Promise<void>;
}

export interface IBuildingRepository {
  getById(ctx: TenantOrgContext, buildingId: string): Promise<BuildingEntity | null>;
  put(entity: BuildingEntity, write: SingleTableWriteContext): Promise<void>;
  deleteById(ctx: TenantOrgContext, buildingId: string): Promise<void>;
}

export interface ICostCenterRepository {
  getById(ctx: TenantOrgContext, costCenterId: string): Promise<CostCenterEntity | null>;
  put(entity: CostCenterEntity, write: SingleTableWriteContext): Promise<void>;
  deleteById(ctx: TenantOrgContext, costCenterId: string): Promise<void>;
}

export interface IAssetRepository {
  getById(ctx: TenantOrgContext, assetId: string): Promise<AssetEntity | null>;
  put(entity: AssetEntity, write: SingleTableWriteContext): Promise<void>;
  deleteById(ctx: TenantOrgContext, assetId: string): Promise<void>;
}

export interface IMeterRepository {
  getById(ctx: TenantOrgContext, meterId: string): Promise<MeterEntity | null>;
  put(entity: MeterEntity, write: SingleTableWriteContext): Promise<void>;
  deleteById(ctx: TenantOrgContext, meterId: string): Promise<void>;
}

export interface IUserRepository {
  getById(ctx: TenantOrgContext, userId: string): Promise<UserEntity | null>;
  put(entity: UserEntity, write: SingleTableWriteContext): Promise<void>;
  deleteById(ctx: TenantOrgContext, userId: string): Promise<void>;
}

export type InvoiceIaExtractedPatch = Partial<Omit<InvoiceDTO, 'pk' | 'sk'>>;

export interface IInvoiceRepository {
  getById(ctx: TenantOrgContext, invoiceId: string): Promise<InvoiceEntity | null>;
  put(entity: InvoiceEntity, write: SingleTableWriteContext): Promise<void>;
  deleteById(ctx: TenantOrgContext, invoiceId: string): Promise<void>;
  /**
   * Fusiona un subconjunto validado en `ia_extracted_data` (worker IA / etapas incrementales).
   * `user_validated_data` permanece intacto hasta confirmación explícita en otro flujo.
   */
  mergeIaExtractedData(
    ctx: TenantOrgContext,
    invoiceId: string,
    patch: InvoiceIaExtractedPatch,
    write: SingleTableWriteContext
  ): Promise<void>;
}

export interface IOrgConfigRepository {
  getByOrgId(ctx: TenantOrgContext, orgId: string): Promise<OrgConfigEntity | null>;
  put(entity: OrgConfigEntity, write: SingleTableWriteContext): Promise<void>;
  deleteByOrgId(ctx: TenantOrgContext, orgId: string): Promise<void>;
}

export interface IAlertRuleRepository {
  getById(ctx: TenantOrgContext, alertRuleId: string): Promise<AlertRuleEntity | null>;
  put(entity: AlertRuleEntity, write: SingleTableWriteContext): Promise<void>;
  deleteById(ctx: TenantOrgContext, alertRuleId: string): Promise<void>;
}

export interface ITariffRepository {
  getById(ctx: TenantOrgContext, tariffId: string): Promise<TariffEntity | null>;
  put(entity: TariffEntity, write: SingleTableWriteContext): Promise<void>;
  deleteById(ctx: TenantOrgContext, tariffId: string): Promise<void>;
}

export interface IProductionLogRepository {
  getByBranchPeriod(ctx: TenantOrgContext, branchId: string, period: string): Promise<ProductionLogEntity | null>;
  put(entity: ProductionLogEntity, write: SingleTableWriteContext): Promise<void>;
  deleteByBranchPeriod(ctx: TenantOrgContext, branchId: string, period: string): Promise<void>;
}

export interface IEmissionFactorRepository {
  getById(ctx: TenantOrgContext, emissionFactorId: string): Promise<EmissionFactorEntity | null>;
  put(entity: EmissionFactorEntity, write: SingleTableWriteContext): Promise<void>;
  deleteById(ctx: TenantOrgContext, emissionFactorId: string): Promise<void>;
}