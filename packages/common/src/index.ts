/** Contratos Zod, entidades de dominio y mappers SMS (sin AWS). */

export { SmsIdSchema, type SmsId } from './shared/sms-id.schema.js';

export type { SmsEntityTag } from './shared/sms-entity-tag.js';

export {
  AssetTypeSchema,
  MeterTypeSchema,
  UserRoleSchema,
  ASSET_TYPE_TO_PERSISTENCE,
  METER_TYPE_TO_PERSISTENCE,
  type AssetType,
  type MeterType,
  type UserRole
} from './shared/domain-enums.js';

export { SmsDomainError, RegionDomainError } from './shared/sms-domain-error.js';

export {
  ROLE_TO_CODE,
  decodeAssetType,
  decodeMeterType,
  decodeRole
} from './shared/persistence-codecs.js';

/* ─── Entities (folders) ─────────────────────────────────────────────────── */

export {
  RegionDTOSchema,
  parseRegionDTO,
  safeParseRegionDTO,
  type RegionDTO,
  RegionEntity,
  RegionMapper,
  type RegionPersistence
} from './region/index.js';

export {
  BranchDTOSchema,
  parseBranchDTO,
  safeParseBranchDTO,
  type BranchDTO,
  BranchEntity,
  BranchMapper,
  type BranchPersistence
} from './branch/index.js';

export {
  BuildingDTOSchema,
  parseBuildingDTO,
  safeParseBuildingDTO,
  type BuildingDTO,
  BuildingEntity,
  BuildingMapper,
  type BuildingPersistence
} from './building/index.js';

export {
  CostCenterDTOSchema,
  parseCostCenterDTO,
  safeParseCostCenterDTO,
  type CostCenterDTO,
  CostCenterEntity,
  CostCenterMapper,
  type CostCenterPersistence
} from './cost-center/index.js';

export {
  AssetDTOSchema,
  parseAssetDTO,
  safeParseAssetDTO,
  type AssetDTO,
  AssetEntity,
  AssetMapper,
  type AssetPersistence
} from './asset/index.js';

export {
  MeterDTOSchema,
  parseMeterDTO,
  safeParseMeterDTO,
  type MeterDTO,
  MeterEntity,
  MeterMapper,
  type MeterPersistence
} from './meter/index.js';

export {
  UserDTOSchema,
  parseUserDTO,
  safeParseUserDTO,
  type UserDTO,
  UserEntity,
  UserMapper,
  type UserPersistence
} from './user/index.js';

export {
  InvoiceDTOSchema,
  parseInvoiceDTO,
  safeParseInvoiceDTO,
  type InvoiceDTO,
  InvoiceEntity,
  InvoiceMapper,
  InvoicePersistenceShape,
  type InvoicePersistence,
  InvoiceProcessingSkeletonSchema,
  buildInvoiceProcessingSkeleton,
  type InvoiceProcessingSkeleton,
  type BuildInvoiceProcessingSkeletonParams
} from './invoice/index.js';

export {
  PresignedUploadUrlInputSchema,
  parsePresignedUploadUrlInput,
  safeParsePresignedUploadUrlInput,
  type PresignedUploadUrlInput
} from './presigned-upload/index.js';

export {
  IndustrySectorSchema,
  CurrencyCodeSchema,
  ReportingCurrencyCodeSchema,
  SubscriptionPlanSchema,
  FacilityTypeSchema,
  IanaTimezoneSchema,
  BuildingUsageTypeSchema,
  OperationalStatusSchema,
  HvacTypeSchema,
  CostAllocationMethodSchema,
  AlertTypeSchema,
  AlertStatusSchema,
  AlertPrioritySchema,
  AlertOperatorSchema,
  UserLanguageSchema,
  EnergyServiceTypeSchema,
  TariffPricingModelSchema,
  ProductionUnitTypeSchema,
  ProductionShiftModeSchema,
  EmissionActivityTypeSchema,
  EmissionScopeSchema,
  EmissionFactorUnitSchema,
  MeterProtocolSchema,
  type IndustrySector,
  type CurrencyCode,
  type ReportingCurrencyCode,
  type SubscriptionPlan,
  type FacilityType,
  type IanaTimezone,
  type BuildingUsageType,
  type OperationalStatus,
  type HvacType,
  type CostAllocationMethod,
  type AlertType,
  type AlertStatus,
  type AlertPriority,
  type AlertOperator,
  type UserLanguage,
  type EnergyServiceType,
  type TariffPricingModel,
  type ProductionUnitType,
  type ProductionShiftMode,
  type EmissionActivityType,
  type EmissionScope,
  type EmissionFactorUnit,
  type MeterProtocol
} from './shared/graphql-setup-enums.js';

export {
  OrgConfigDTOSchema,
  parseOrgConfigDTO,
  safeParseOrgConfigDTO,
  type OrgConfigDTO,
  OrgConfigEntity,
  OrgConfigMapper,
  type OrgConfigPersistence
} from './org-config/index.js';

export {
  AlertRuleDTOSchema,
  parseAlertRuleDTO,
  safeParseAlertRuleDTO,
  type AlertRuleDTO,
  AlertRuleEntity,
  AlertRuleMapper,
  type AlertRulePersistence
} from './alert-rule/index.js';

export {
  TariffDTOSchema,
  parseTariffDTO,
  safeParseTariffDTO,
  type TariffDTO,
  TariffEntity,
  TariffMapper,
  type TariffPersistence
} from './tariff/index.js';

export {
  ProductionLogDTOSchema,
  parseProductionLogDTO,
  safeParseProductionLogDTO,
  type ProductionLogDTO,
  ProductionLogEntity,
  ProductionLogMapper,
  type ProductionLogPersistence
} from './production-log/index.js';

export {
  EmissionFactorDTOSchema,
  parseEmissionFactorDTO,
  safeParseEmissionFactorDTO,
  type EmissionFactorDTO,
  EmissionFactorEntity,
  EmissionFactorMapper,
  type EmissionFactorPersistence
} from './emission-factor/index.js';

export {
  InvoiceSkSchema,
  type InvoiceSk,
  S3DispatcherInvokeSchema,
  parseS3DispatcherInvoke,
  safeParseS3DispatcherInvoke,
  type S3DispatcherInvoke,
  DecodedInvoiceUploadKeySchema,
  safeParseDecodedInvoiceUploadKey,
  type DecodedInvoiceUploadKey,
  InvoiceDispatchQueueMessageSchema,
  parseInvoiceDispatchQueueMessage,
  safeParseInvoiceDispatchQueueMessage,
  type InvoiceDispatchQueueMessage,
  DispatcherEnqueueResultSchema,
  parseDispatcherEnqueueResult,
  type DispatcherEnqueueResult,
  InvoiceWorkerLegacyQueueBodySchema,
  parseInvoiceWorkerPipelineInput,
  type InvoiceWorkerLegacyQueueBody,
  type InvoiceWorkerPipelineInput
} from './s3-invoice-dispatch/index.js';
