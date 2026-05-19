import type { InvoiceDTO } from '@sms/common';
import {
  parseAlertRuleDTO,
  parseAssetDTO,
  parseBranchDTO,
  parseBuildingDTO,
  parseCostCenterDTO,
  parseEmissionFactorDTO,
  parseInvoiceDTO,
  parseMeterDTO,
  parseOrganizationDTO,
  parseProductionLogDTO,
  parseRegionDTO,
  parseTariffDTO,
  parseUserDTO
} from '@sms/common';
import {
  AlertRuleEntity,
  AssetEntity,
  BranchEntity,
  BuildingEntity,
  CostCenterEntity,
  EmissionFactorEntity,
  InvoiceEntity,
  MeterEntity,
  OrgConfigEntity,
  ProductionLogEntity,
  RegionEntity,
  TariffEntity,
  UserEntity
} from '@sms/domain';
import { buildEntitySortKey, buildProductionLogSortKey, buildTenantOrgPartitionKey, parseEntityIdFromSortKey } from '../tenancy-keys.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import type { SingleTableInfrastructureFields, SingleTablePersistenceContext } from '../entities/single-table-record.entity.js';
import type {
  AlertRulePersistenceModel,
  AssetPersistenceModel,
  BranchPersistenceModel,
  BuildingPersistenceModel,
  CostCenterPersistenceModel,
  EmissionFactorPersistenceModel,
  InvoiceBusinessBlob,
  InvoicePersistenceModel,
  MeterPersistenceModel,
  OrgConfigPersistenceModel,
  ProductionLogPersistenceModel,
  RegionPersistenceModel,
  TariffPersistenceModel,
  UserPersistenceModel
} from '../entities/db/index.js';
import { persistenceModelToDynamoAttributes } from './dynamo-serde.js';
import { entityPlainRecord, omitKeys } from './entity-plain.js';

const AUDIT_OMIT = ['createdAt', 'updatedAt'] as const;

function stripInfrastructure(row: Record<string, unknown>): Record<string, unknown> {
  const { PK: _a, SK: _b, entityType: _c, _version: _d, recordCreatedAt: _e, recordUpdatedAt: _f, ...rest } = row;
  return rest;
}

function buildInfrastructure(
  ctx: SingleTablePersistenceContext,
  entityType: string,
  sortKey: string
): SingleTableInfrastructureFields {
  return {
    PK: buildTenantOrgPartitionKey(ctx),
    SK: sortKey,
    entityType,
    _version: ctx.version,
    recordCreatedAt: ctx.recordCreatedAt,
    recordUpdatedAt: ctx.recordUpdatedAt
  };
}

function invoiceBlobFromEntity(entity: InvoiceEntity): InvoiceBusinessBlob {
  return {
    aiAnalysis: { ...entity.aiAnalysis },
    analyticsDimensions: { ...entity.analyticsDimensions },
    climatiqResult: { ...entity.climatiqResult },
    extractedData: {
      ...entity.extractedData,
      billingPeriod: { ...entity.extractedData.billingPeriod }
    },
    metadata: {
      ...entity.metadata,
      thoughtProcess: { ...entity.metadata.thoughtProcess }
    },
    technicalExtraction: { ...entity.technicalExtraction },
    processedAt: entity.processedAt,
    totalDaysProrated: entity.totalDaysProrated
  };
}

export function mergeInvoiceBusinessBlobs(
  ia: InvoiceBusinessBlob | undefined,
  uv: InvoiceBusinessBlob | undefined
): Omit<InvoiceDTO, 'pk' | 'sk'> {
  return {
    aiAnalysis: { ...ia?.aiAnalysis, ...uv?.aiAnalysis } as InvoiceDTO['aiAnalysis'],
    analyticsDimensions: { ...ia?.analyticsDimensions, ...uv?.analyticsDimensions } as InvoiceDTO['analyticsDimensions'],
    climatiqResult: { ...ia?.climatiqResult, ...uv?.climatiqResult } as InvoiceDTO['climatiqResult'],
    extractedData: {
      ...ia?.extractedData,
      ...uv?.extractedData,
      billingPeriod: {
        ...ia?.extractedData?.billingPeriod,
        ...uv?.extractedData?.billingPeriod
      }
    } as InvoiceDTO['extractedData'],
    metadata: {
      ...ia?.metadata,
      ...uv?.metadata,
      thoughtProcess: {
        ...ia?.metadata?.thoughtProcess,
        ...uv?.metadata?.thoughtProcess
      }
    } as InvoiceDTO['metadata'],
    technicalExtraction: {
      ...ia?.technicalExtraction,
      ...uv?.technicalExtraction
    } as InvoiceDTO['technicalExtraction'],
    processedAt: (uv?.processedAt ?? ia?.processedAt) as string,
    totalDaysProrated: (uv?.totalDaysProrated ?? ia?.totalDaysProrated) as number
  };
}

export const RegionSingleTableMapper = {
  toPersistence(entity: RegionEntity, ctx: SingleTablePersistenceContext): RegionPersistenceModel {
    const base = buildInfrastructure(ctx, SingleTableEntityType.REGION, buildEntitySortKey(SingleTableEntityType.REGION, entity.id));
    const payload = omitKeys(entityPlainRecord(entity), AUDIT_OMIT) as Omit<RegionPersistenceModel, keyof SingleTableInfrastructureFields>;
    return { ...base, ...payload, entityType: SingleTableEntityType.REGION };
  },
  toDomainEntity(model: RegionPersistenceModel): RegionEntity {
    return RegionEntity.fromDTO(parseRegionDTO(stripInfrastructure(model as unknown as Record<string, unknown>)));
  },
  toDynamoAttributes(model: RegionPersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};

export const BranchSingleTableMapper = {
  toPersistence(entity: BranchEntity, ctx: SingleTablePersistenceContext): BranchPersistenceModel {
    const base = buildInfrastructure(ctx, SingleTableEntityType.BRANCH, buildEntitySortKey(SingleTableEntityType.BRANCH, entity.id));
    const payload = omitKeys(entityPlainRecord(entity), AUDIT_OMIT) as Omit<BranchPersistenceModel, keyof SingleTableInfrastructureFields>;
    return { ...base, ...payload, entityType: SingleTableEntityType.BRANCH };
  },
  toDomainEntity(model: BranchPersistenceModel): BranchEntity {
    return BranchEntity.fromDTO(parseBranchDTO(stripInfrastructure(model as unknown as Record<string, unknown>)));
  },
  toDynamoAttributes(model: BranchPersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};

export const BuildingSingleTableMapper = {
  toPersistence(entity: BuildingEntity, ctx: SingleTablePersistenceContext): BuildingPersistenceModel {
    const base = buildInfrastructure(ctx, SingleTableEntityType.SITE, buildEntitySortKey(SingleTableEntityType.SITE, entity.id));
    const payload = omitKeys(entityPlainRecord(entity), AUDIT_OMIT) as Omit<BuildingPersistenceModel, keyof SingleTableInfrastructureFields>;
    return { ...base, ...payload, entityType: SingleTableEntityType.SITE };
  },
  toDomainEntity(model: BuildingPersistenceModel): BuildingEntity {
    return BuildingEntity.fromDTO(parseBuildingDTO(stripInfrastructure(model as unknown as Record<string, unknown>)));
  },
  toDynamoAttributes(model: BuildingPersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};

export const CostCenterSingleTableMapper = {
  toPersistence(entity: CostCenterEntity, ctx: SingleTablePersistenceContext): CostCenterPersistenceModel {
    const base = buildInfrastructure(
      ctx,
      SingleTableEntityType.COST_CENTER,
      buildEntitySortKey(SingleTableEntityType.COST_CENTER, entity.id)
    );
    const payload = omitKeys(entityPlainRecord(entity), AUDIT_OMIT) as Omit<CostCenterPersistenceModel, keyof SingleTableInfrastructureFields>;
    return { ...base, ...payload, entityType: SingleTableEntityType.COST_CENTER };
  },
  toDomainEntity(model: CostCenterPersistenceModel): CostCenterEntity {
    return CostCenterEntity.fromDTO(parseCostCenterDTO(stripInfrastructure(model as unknown as Record<string, unknown>)));
  },
  toDynamoAttributes(model: CostCenterPersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};

export const AssetSingleTableMapper = {
  toPersistence(entity: AssetEntity, ctx: SingleTablePersistenceContext): AssetPersistenceModel {
    const base = buildInfrastructure(ctx, SingleTableEntityType.ASSET, buildEntitySortKey(SingleTableEntityType.ASSET, entity.id));
    const payload = omitKeys(entityPlainRecord(entity), AUDIT_OMIT) as Omit<AssetPersistenceModel, keyof SingleTableInfrastructureFields>;
    return { ...base, ...payload, entityType: SingleTableEntityType.ASSET };
  },
  toDomainEntity(model: AssetPersistenceModel): AssetEntity {
    return AssetEntity.fromDTO(parseAssetDTO(stripInfrastructure(model as unknown as Record<string, unknown>)));
  },
  toDynamoAttributes(model: AssetPersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};

export const MeterSingleTableMapper = {
  toPersistence(entity: MeterEntity, ctx: SingleTablePersistenceContext): MeterPersistenceModel {
    const base = buildInfrastructure(ctx, SingleTableEntityType.METER, buildEntitySortKey(SingleTableEntityType.METER, entity.id));
    const payload = omitKeys(entityPlainRecord(entity), AUDIT_OMIT) as Omit<MeterPersistenceModel, keyof SingleTableInfrastructureFields>;
    return { ...base, ...payload, entityType: SingleTableEntityType.METER };
  },
  toDomainEntity(model: MeterPersistenceModel): MeterEntity {
    return MeterEntity.fromDTO(parseMeterDTO(stripInfrastructure(model as unknown as Record<string, unknown>)));
  },
  toDynamoAttributes(model: MeterPersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};

export const UserSingleTableMapper = {
  toPersistence(entity: UserEntity, ctx: SingleTablePersistenceContext): UserPersistenceModel {
    const base = buildInfrastructure(ctx, SingleTableEntityType.USER, buildEntitySortKey(SingleTableEntityType.USER, entity.id));
    const payload = entityPlainRecord(entity) as Omit<UserPersistenceModel, keyof SingleTableInfrastructureFields>;
    return { ...base, ...payload, entityType: SingleTableEntityType.USER };
  },
  toDomainEntity(model: UserPersistenceModel): UserEntity {
    return UserEntity.fromDTO(parseUserDTO(stripInfrastructure(model as unknown as Record<string, unknown>)));
  },
  toDynamoAttributes(model: UserPersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};

export type InvoicePersistenceOptions = {
  /** Snapshot humano opcional (confirmación). */
  userValidatedData?: InvoiceBusinessBlob;
  /**
   * Cuando el worker aún no completó el DTO, se puede persistir un subconjunto parcial
   * distinto del derivado de la entidad (la entidad exige invariantes completas).
   */
  iaExtractedDataOverride?: InvoiceBusinessBlob;
};

export const InvoiceSingleTableMapper = {
  toPersistence(
    entity: InvoiceEntity,
    ctx: SingleTablePersistenceContext,
    options?: InvoicePersistenceOptions
  ): InvoicePersistenceModel {
    const { id } = parseEntityIdFromSortKey(entity.sk);
    const base = buildInfrastructure(ctx, SingleTableEntityType.INV, buildEntitySortKey(SingleTableEntityType.INV, id));
    const ia = options?.iaExtractedDataOverride ?? invoiceBlobFromEntity(entity);
    return {
      ...base,
      entityType: SingleTableEntityType.INV,
      iaExtractedData: ia,
      userValidatedData: options?.userValidatedData
    };
  },
  toDomainEntity(model: InvoicePersistenceModel): InvoiceEntity {
    const merged = mergeInvoiceBusinessBlobs(model.iaExtractedData, model.userValidatedData);
    const dto = parseInvoiceDTO({
      pk: model.PK,
      sk: model.SK,
      ...merged
    });
    return InvoiceEntity.fromDTO(dto);
  },
  toDynamoAttributes(model: InvoicePersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};

export const OrgConfigSingleTableMapper = {
  toPersistence(entity: OrgConfigEntity, ctx: SingleTablePersistenceContext): OrgConfigPersistenceModel {
    const base = buildInfrastructure(
      ctx,
      SingleTableEntityType.ORG_CONFIG,
      buildEntitySortKey(SingleTableEntityType.ORG_CONFIG, entity.orgId)
    );
    const payload = omitKeys(entityPlainRecord(entity), AUDIT_OMIT) as Omit<OrgConfigPersistenceModel, keyof SingleTableInfrastructureFields>;
    return { ...base, ...payload, entityType: SingleTableEntityType.ORG_CONFIG };
  },
  toDomainEntity(model: OrgConfigPersistenceModel): OrgConfigEntity {
    const rest = stripInfrastructure(model as unknown as Record<string, unknown>);
    return OrgConfigEntity.fromOrganizationDTO(parseOrganizationDTO(rest));
  },
  toDynamoAttributes(model: OrgConfigPersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};

export const AlertRuleSingleTableMapper = {
  toPersistence(entity: AlertRuleEntity, ctx: SingleTablePersistenceContext): AlertRulePersistenceModel {
    const base = buildInfrastructure(ctx, SingleTableEntityType.ALERT_RULE, buildEntitySortKey(SingleTableEntityType.ALERT_RULE, entity.id));
    const plain = omitKeys(entityPlainRecord(entity), [...AUDIT_OMIT, 'entityType']) as Omit<
      AlertRulePersistenceModel,
      keyof SingleTableInfrastructureFields | 'monitoredEntityType'
    >;
    return {
      ...base,
      ...plain,
      entityType: SingleTableEntityType.ALERT_RULE,
      monitoredEntityType: entity.entityType
    };
  },
  toDomainEntity(model: AlertRulePersistenceModel): AlertRuleEntity {
    const rest = stripInfrastructure(model as unknown as Record<string, unknown>);
    const { monitoredEntityType, ...tail } = rest as { monitoredEntityType: AlertRuleEntity['entityType'] } & Record<string, unknown>;
    return AlertRuleEntity.fromDTO(
      parseAlertRuleDTO({
        ...tail,
        entityType: monitoredEntityType
      })
    );
  },
  toDynamoAttributes(model: AlertRulePersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};

export const TariffSingleTableMapper = {
  toPersistence(entity: TariffEntity, ctx: SingleTablePersistenceContext): TariffPersistenceModel {
    const base = buildInfrastructure(ctx, SingleTableEntityType.TARIFF, buildEntitySortKey(SingleTableEntityType.TARIFF, entity.id));
    const payload = omitKeys(entityPlainRecord(entity), AUDIT_OMIT) as Omit<TariffPersistenceModel, keyof SingleTableInfrastructureFields>;
    return { ...base, ...payload, entityType: SingleTableEntityType.TARIFF };
  },
  toDomainEntity(model: TariffPersistenceModel): TariffEntity {
    return TariffEntity.fromDTO(parseTariffDTO(stripInfrastructure(model as unknown as Record<string, unknown>)));
  },
  toDynamoAttributes(model: TariffPersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};

export const ProductionLogSingleTableMapper = {
  toPersistence(entity: ProductionLogEntity, ctx: SingleTablePersistenceContext): ProductionLogPersistenceModel {
    const sk = buildProductionLogSortKey(entity.branchId, entity.period);
    const base = buildInfrastructure(ctx, SingleTableEntityType.PRODUCTION_LOG, sk);
    const payload = entityPlainRecord(entity) as Omit<ProductionLogPersistenceModel, keyof SingleTableInfrastructureFields>;
    return { ...base, ...payload, entityType: SingleTableEntityType.PRODUCTION_LOG };
  },
  toDomainEntity(model: ProductionLogPersistenceModel): ProductionLogEntity {
    const rest = stripInfrastructure(model as unknown as Record<string, unknown>) as Record<string, unknown>;
    const dto = parseProductionLogDTO({
      units: rest.units,
      unitType: rest.unitType,
      shiftMode: rest.shiftMode,
      efficiency: rest.efficiency,
      activeLines: rest.activeLines
    });
    return ProductionLogEntity.fromMutation(rest.orgId as string, rest.branchId as string, rest.period as string, dto);
  },
  toDynamoAttributes(model: ProductionLogPersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};

export const EmissionFactorSingleTableMapper = {
  toPersistence(entity: EmissionFactorEntity, ctx: SingleTablePersistenceContext): EmissionFactorPersistenceModel {
    const base = buildInfrastructure(
      ctx,
      SingleTableEntityType.EMISSION_FACTOR,
      buildEntitySortKey(SingleTableEntityType.EMISSION_FACTOR, entity.id)
    );
    const payload = omitKeys(entityPlainRecord(entity), AUDIT_OMIT) as Omit<
      EmissionFactorPersistenceModel,
      keyof SingleTableInfrastructureFields
    >;
    return { ...base, ...payload, entityType: SingleTableEntityType.EMISSION_FACTOR };
  },
  toDomainEntity(model: EmissionFactorPersistenceModel): EmissionFactorEntity {
    return EmissionFactorEntity.fromDTO(parseEmissionFactorDTO(stripInfrastructure(model as unknown as Record<string, unknown>)));
  },
  toDynamoAttributes(model: EmissionFactorPersistenceModel): Record<string, unknown> {
    return persistenceModelToDynamoAttributes(model as unknown as Record<string, unknown>);
  }
};
