import { z } from 'zod';

/** Literales presentes en `setting-organization.sh` (mutaciones AppSync). */

export const IndustrySectorSchema = z.enum(['MANUFACTURING']);
export const CurrencyCodeSchema = z.enum(['ILS']);
export const ReportingCurrencyCodeSchema = z.enum(['USD']);
export const SubscriptionPlanSchema = z.enum(['ENTERPRISE']);
export const FacilityTypeSchema = z.enum(['MANUFACTURING']);
export const IanaTimezoneSchema = z.enum(['Asia/Jerusalem']);
export const BuildingUsageTypeSchema = z.enum(['STORAGE_INDUSTRIAL']);
/** Estado operativo de edificios / instalaciones. */
export const OperationalStatusSchema = z.enum([
  'OPERATIONAL',
  'INACTIVE',
  'MAINTENANCE',
  'STANDBY'
]);
export const HvacTypeSchema = z.enum(['CENTRAL_CHILLER']);
export const CostAllocationMethodSchema = z.enum(['FIXED', 'PERCENTAGE', 'SQUARE_METERS']);
/** Alta / baja para entidades jerárquicas (región, sucursal, etc.). */
export const LifecycleStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const AssetLifecycleStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']);
export const MeterOperationalStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'FAULT']);
export const TariffLifecycleStatusSchema = z.enum(['ACTIVE', 'EXPIRED', 'PENDING', 'ARCHIVED']);
export const MainFuelTypeSchema = z.enum(['ELECTRICITY', 'GAS', 'DIESEL', 'RENEWABLE']);
export const UserLanguageSchema = z.enum(['es']);
export const EnergyServiceTypeSchema = z.enum(['ELECTRICITY', 'GAS', 'WATER', 'STEAM']);
export const TariffPricingModelSchema = z.enum(['FIXED', 'TIME_OF_USE', 'TIERED', 'INDEXED']);
export const ProductionUnitTypeSchema = z.enum(['TONS']);
export const ProductionShiftModeSchema = z.enum(['24/7']);
export const MeterProtocolSchema = z.enum(['MQTT', 'MODBUS', 'BACNET', 'M_BUS', 'LORAWAN']);

export type IndustrySector = z.infer<typeof IndustrySectorSchema>;
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;
export type ReportingCurrencyCode = z.infer<typeof ReportingCurrencyCodeSchema>;
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;
export type FacilityType = z.infer<typeof FacilityTypeSchema>;
export type IanaTimezone = z.infer<typeof IanaTimezoneSchema>;
export type BuildingUsageType = z.infer<typeof BuildingUsageTypeSchema>;
export type OperationalStatus = z.infer<typeof OperationalStatusSchema>;
export type HvacType = z.infer<typeof HvacTypeSchema>;
export type CostAllocationMethod = z.infer<typeof CostAllocationMethodSchema>;
export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>;
export type AssetLifecycleStatus = z.infer<typeof AssetLifecycleStatusSchema>;
export type MeterOperationalStatus = z.infer<typeof MeterOperationalStatusSchema>;
export type TariffLifecycleStatus = z.infer<typeof TariffLifecycleStatusSchema>;
export type MainFuelType = z.infer<typeof MainFuelTypeSchema>;
export type UserLanguage = z.infer<typeof UserLanguageSchema>;
export type EnergyServiceType = z.infer<typeof EnergyServiceTypeSchema>;
export type TariffPricingModel = z.infer<typeof TariffPricingModelSchema>;
export type ProductionUnitType = z.infer<typeof ProductionUnitTypeSchema>;
export type ProductionShiftMode = z.infer<typeof ProductionShiftModeSchema>;
export type MeterProtocol = z.infer<typeof MeterProtocolSchema>;
