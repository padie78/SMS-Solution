/** Contratos Zod, entidades de dominio y mappers SMS (sin AWS). */

export {
  EntityType,
  EntityTypeSchema,
  ENTITY_TYPE_VALUES,
  isEntityType,
  ENTITY_TYPE_I18N,
  getEntityTypeI18nKey,
  ENERGY_SERVICE_TYPE_I18N,
  getEnergyServiceTypeI18nKey,
  type EntityTypeI18nKey,
  type EnergyServiceTypeI18nKey
} from './shared/i18n/index.js';

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
  AddressDTOSchema,
  type AddressDTO
} from './shared/address.dto.js';

export {
  GeoCoordinatesDTOSchema,
  type GeoCoordinatesDTO
} from './shared/geo.dto.js';

export {
  ROLE_TO_CODE,
  decodeAssetType,
  decodeMeterType,
  decodeRole
} from './shared/persistence-codecs.js';

/* ─── Entities (folders) ─────────────────────────────────────────────────── */

export {
  RegionDTOSchema,
  RegionalManagerDTOSchema,
  ClimateZoneSchema,
  CarbonMarketTypeSchema,
  MaturityLevelSchema,
  EconomicAreaSchema,
  parseRegionDTO,
  safeParseRegionDTO,
  RegionDTO,
  type RegionDTOInput,
  type ClimateZone,
  type CarbonMarketType,
  type MaturityLevel,
  type EconomicArea,
  RegionEntity,
  RegionMapper,
  type RegionPersistence
} from './region/index.js';

export {
  BranchDTOSchema,
  BranchStatusSchema,
  BranchTypeSchema,
  OwnershipTypeSchema,
  BackupPowerTypeSchema,
  OperatingHoursDTOSchema,
  BranchManagerDTOSchema,
  parseBranchDTO,
  safeParseBranchDTO,
  BranchDTO,
  type BranchDTOInput,
  type BranchStatus,
  type BranchType,
  type OwnershipType,
  type BackupPowerType,
  BranchEntity,
  BranchMapper,
  type BranchPersistence
} from './branch/index.js';

export {
  BuildingDTOSchema,
  parseBuildingDTO,
  safeParseBuildingDTO,
  BuildingDTO,
  type BuildingDTOInput,
  BuildingInsulationQualitySchema,
  BuildingRoofTypeSchema,
  BuildingMaintenanceStatusSchema,
  BuildingLightingTechnologySchema,
  BuildingDataGranularitySchema,
  BuildingSubmeteringTopologySchema,
  type BuildingInsulationQuality,
  type BuildingRoofType,
  type BuildingMaintenanceStatus,
  type BuildingLightingTechnology,
  type BuildingDataGranularity,
  type BuildingSubmeteringTopology,
  BuildingEntity,
  BuildingMapper,
  type BuildingPersistence
} from './building/index.js';

export {
  CostCenterDTOSchema,
  parseCostCenterDTO,
  safeParseCostCenterDTO,
  CostCenterDTO,
  type CostCenterDTOInput,
  CostCenterTypeSchema,
  CostCenterForecastModelSchema,
  type CostCenterType,
  type CostCenterForecastModel,
  CostCenterEntity,
  CostCenterMapper,
  type CostCenterPersistence
} from './cost-center/index.js';

export {
  AssetDTOSchema,
  parseAssetDTO,
  safeParseAssetDTO,
  AssetDTO,
  type AssetDTOInput,
  AssetCriticalitySchema,
  AssetEnergySourceSchema,
  AssetGhgScopeSchema,
  AssetEmissionSourceCategorySchema,
  AssetConditionIndexSchema,
  AssetRedundancyLevelSchema,
  type AssetCriticality,
  type AssetEnergySource,
  type AssetGhgScope,
  type AssetEmissionSourceCategory,
  type AssetConditionIndex,
  type AssetRedundancyLevel,
  AssetEntity,
  AssetMapper,
  type AssetPersistence
} from './asset/index.js';

export {
  MeterDTOSchema,
  parseMeterDTO,
  safeParseMeterDTO,
  MeterDTO,
  type MeterDTOInput,
  MeterServiceTypeSchema,
  MeterUnitSchema,
  MeterAccuracyClassSchema,
  MeterCommunicationStatusSchema,
  type MeterServiceType,
  type MeterUnit,
  type MeterAccuracyClass,
  type MeterCommunicationStatus,
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
  type BuildInvoiceProcessingSkeletonParams,
  InvoiceLifecycleStatusSchema,
  InvoiceCalculationMethodSchema,
  InvoiceBillingPeriodSchema,
  InvoiceExtractedDataSchema,
  InvoiceThoughtProcessSchema,
  InvoiceAiAnalysisSchema,
  InvoiceAnalyticsDimensionsSchema,
  InvoiceClimatiqResultSchema,
  InvoiceMetadataSchema,
  InvoiceDdbItemSchema,
  InvoiceConfirmPayloadSchema,
  parseInvoiceDdbItem,
  safeParseInvoiceDdbItem,
  parseInvoiceConfirmPayload,
  safeParseInvoiceConfirmPayload,
  type InvoiceLifecycleStatus,
  type InvoiceCalculationMethod,
  type InvoiceBillingPeriod,
  type InvoiceExtractedData,
  type InvoiceThoughtProcess,
  type InvoiceAiAnalysis,
  type InvoiceAnalyticsDimensions,
  type InvoiceClimatiqResult,
  type InvoiceMetadata,
  type InvoiceDdbItem,
  type InvoiceConfirmPayload,
  InvoiceAuditActorSchema,
  InvoiceAuditActionSchema,
  InvoiceAuditSourceSchema,
  InvoiceAuditEntrySchema,
  InvoiceAuditTrailSchema,
  buildInitialAuditEntry,
  type InvoiceAuditActor,
  type InvoiceAuditAction,
  type InvoiceAuditSource,
  type InvoiceAuditEntry,
  type InvoiceAuditTrail
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
  UserLanguageSchema,
  EnergyServiceTypeSchema,
  TariffPricingModelSchema,
  ProductionUnitTypeSchema,
  ProductionShiftModeSchema,
  MeterProtocolSchema,
  LifecycleStatusSchema,
  AssetLifecycleStatusSchema,
  MeterOperationalStatusSchema,
  TariffLifecycleStatusSchema,
  MainFuelTypeSchema,
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
  type UserLanguage,
  type EnergyServiceType,
  type TariffPricingModel,
  type ProductionUnitType,
  type ProductionShiftMode,
  type MeterProtocol,
  type LifecycleStatus,
  type AssetLifecycleStatus,
  type MeterOperationalStatus,
  type TariffLifecycleStatus,
  type MainFuelType
} from './shared/graphql-setup-enums.js';

export {
  OrgConfigDTOSchema,
  parseOrgConfigDTO,
  safeParseOrgConfigDTO,
  type OrgConfigDTO,
  OrganizationDTOSchema,
  parseOrganizationDTO,
  safeParseOrganizationDTO,
  OrganizationDTO,
  type OrganizationDTOInput,
  OrgConfigEntity,
  OrgConfigMapper,
  type OrgConfigPersistence,
  type OrganizationDynamoItem
} from './org-config/index.js';

export {
  AlertRuleDTOSchema,
  parseAlertRuleDTO,
  safeParseAlertRuleDTO,
  AlertRuleDTO,
  generateAlertRuleId,
  AlertRuleEntityTypeSchema,
  AlertRuleDetectionTypeSchema,
  AlertRuleThresholdOperatorSymbolSchema,
  AlertRuleAggregationMethodSchema,
  AlertRulePrioritySchema,
  AlertRuleRuleStatusSchema,
  AlertRuleMonitorScopeSchema,
  AlertRuleNotificationChannelSchema,
  type AlertRuleDTOInput,
  AlertRuleEntity,
  AlertRuleMapper,
  type AlertRulePersistence
} from './alert-rule/index.js';

export {
  TariffDTOSchema,
  parseTariffDTO,
  safeParseTariffDTO,
  TariffDTO,
  TariffDemandChargeUnitSchema,
  TariffSeasonSchema,
  TariffTierRatePairSchema,
  generateTariffId,
  type TariffDTOInput,
  type TariffDemandChargeUnit,
  type TariffSeason,
  type TariffTierRatePair,
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
  EmissionFactorDTO,
  generateEmissionFactorId,
  EmissionFactorActivityTypeSchema,
  EmissionFactorScopeNumberSchema,
  EmissionFactorPhysicalUnitSchema,
  EmissionFactorCalculationMethodSchema,
  EmissionFactorGwpReferenceSchema,
  EmissionFactorCatalogStatusSchema,
  EmissionFactorDataQualityTierSchema,
  type EmissionFactorDTOInput,
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
