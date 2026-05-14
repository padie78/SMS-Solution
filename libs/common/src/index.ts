/** Shared Zod contracts and DTOs (`@sms/contracts`, carpeta `libs/common` → `dtos/` + `schemas/`) — consumible por Angular y Node. */

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
} from './dtos/shared/i18n/index.js';

export { SmsIdSchema, type SmsId } from './schemas/sms-id.schema.js';

export type { SmsEntityTag } from './dtos/shared/sms-entity-tag.js';

export {
  AssetTypeSchema,
  MeterTypeSchema,
  UserRoleSchema,
  ASSET_TYPE_TO_PERSISTENCE,
  METER_TYPE_TO_PERSISTENCE,
  type AssetType,
  type MeterType,
  type UserRole
} from './dtos/shared/domain-enums.js';

export { SmsDomainError, RegionDomainError } from './dtos/shared/sms-domain-error.js';

export {
  AddressDTOSchema,
  type AddressDTO
} from './dtos/shared/address.dto.js';

export {
  GeoCoordinatesDTOSchema,
  type GeoCoordinatesDTO
} from './dtos/shared/geo.dto.js';

export {
  ROLE_TO_CODE,
  decodeAssetType,
  decodeMeterType,
  decodeRole
} from './dtos/shared/persistence-codecs.js';

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
  type EconomicArea
} from './dtos/region/index.js';

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
  type BackupPowerType
} from './dtos/branch/index.js';

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
  type BuildingSubmeteringTopology
} from './dtos/building/index.js';

export {
  CostCenterDTOSchema,
  parseCostCenterDTO,
  safeParseCostCenterDTO,
  CostCenterDTO,
  type CostCenterDTOInput,
  CostCenterTypeSchema,
  CostCenterForecastModelSchema,
  type CostCenterType,
  type CostCenterForecastModel
} from './dtos/cost-center/index.js';

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
  type AssetRedundancyLevel
} from './dtos/asset/index.js';

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
  type MeterCommunicationStatus
} from './dtos/meter/index.js';

export {
  UserDTOSchema,
  parseUserDTO,
  safeParseUserDTO,
  type UserDTO
} from './dtos/user/index.js';

export {
  InvoiceDTOSchema,
  parseInvoiceDTO,
  safeParseInvoiceDTO,
  type InvoiceDTO,
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
  type InvoiceAuditTrail,
  InvoiceIaTechnicalExtractionSchema,
  InvoiceIaExtractionSqsBodySchema,
  parseInvoiceIaExtractionSqsBody,
  buildInitialInvoiceIaTechnicalExtraction
} from './dtos/invoice/index.js';

export type { InvoiceIaTechnicalExtraction, InvoiceIaExtractionSqsBody } from './dtos/invoice/index.js';

export {
  PresignedUploadUrlInputSchema,
  parsePresignedUploadUrlInput,
  safeParsePresignedUploadUrlInput,
  type PresignedUploadUrlInput
} from './dtos/presigned-upload/index.js';

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
} from './dtos/shared/graphql-setup-enums.js';

export {
  OrgConfigDTOSchema,
  parseOrgConfigDTO,
  safeParseOrgConfigDTO,
  type OrgConfigDTO,
  OrganizationDTOSchema,
  parseOrganizationDTO,
  safeParseOrganizationDTO,
  OrganizationDTO,
  type OrganizationDTOInput
} from './dtos/org-config/index.js';

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
  type AlertRuleDTOInput
} from './dtos/alert-rule/index.js';

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
  type TariffTierRatePair
} from './dtos/tariff/index.js';

export {
  ProductionLogDTOSchema,
  parseProductionLogDTO,
  safeParseProductionLogDTO,
  type ProductionLogDTO
} from './dtos/production-log/index.js';

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
  type EmissionFactorDTOInput
} from './dtos/emission-factor/index.js';

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
} from './dtos/s3-invoice-dispatch/index.js';
