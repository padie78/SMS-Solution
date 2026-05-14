import { z } from 'zod';
/** Literales presentes en `setting-organization.sh` (mutaciones AppSync). */
export declare const IndustrySectorSchema: z.ZodEnum<["MANUFACTURING"]>;
export declare const CurrencyCodeSchema: z.ZodEnum<["ILS"]>;
export declare const ReportingCurrencyCodeSchema: z.ZodEnum<["USD"]>;
export declare const SubscriptionPlanSchema: z.ZodEnum<["ENTERPRISE"]>;
export declare const FacilityTypeSchema: z.ZodEnum<["MANUFACTURING"]>;
export declare const IanaTimezoneSchema: z.ZodEnum<["Asia/Jerusalem"]>;
export declare const BuildingUsageTypeSchema: z.ZodEnum<["STORAGE_INDUSTRIAL"]>;
/** Estado operativo de edificios / instalaciones. */
export declare const OperationalStatusSchema: z.ZodEnum<["OPERATIONAL", "INACTIVE", "MAINTENANCE", "STANDBY"]>;
export declare const HvacTypeSchema: z.ZodEnum<["CENTRAL_CHILLER"]>;
export declare const CostAllocationMethodSchema: z.ZodEnum<["FIXED", "PERCENTAGE", "SQUARE_METERS"]>;
/** Alta / baja para entidades jerárquicas (región, sucursal, etc.). */
export declare const LifecycleStatusSchema: z.ZodEnum<["ACTIVE", "INACTIVE"]>;
export declare const AssetLifecycleStatusSchema: z.ZodEnum<["ACTIVE", "INACTIVE", "MAINTENANCE"]>;
export declare const MeterOperationalStatusSchema: z.ZodEnum<["ACTIVE", "INACTIVE", "FAULT"]>;
export declare const TariffLifecycleStatusSchema: z.ZodEnum<["ACTIVE", "EXPIRED", "PENDING", "ARCHIVED"]>;
export declare const MainFuelTypeSchema: z.ZodEnum<["ELECTRICITY", "GAS", "DIESEL", "RENEWABLE"]>;
export declare const UserLanguageSchema: z.ZodEnum<["es"]>;
export declare const EnergyServiceTypeSchema: z.ZodEnum<["ELECTRICITY", "GAS", "WATER", "STEAM"]>;
export declare const TariffPricingModelSchema: z.ZodEnum<["FIXED", "TIME_OF_USE", "TIERED", "INDEXED"]>;
export declare const ProductionUnitTypeSchema: z.ZodEnum<["TONS"]>;
export declare const ProductionShiftModeSchema: z.ZodEnum<["24/7"]>;
export declare const MeterProtocolSchema: z.ZodEnum<["MQTT", "MODBUS", "BACNET", "M_BUS", "LORAWAN"]>;
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
//# sourceMappingURL=graphql-setup-enums.d.ts.map