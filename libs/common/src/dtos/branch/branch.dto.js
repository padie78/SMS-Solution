import { z } from 'zod';
import { SmsIdSchema } from '../../schemas/sms-id.schema.js';
export const BranchStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'CONSTRUCTION']);
export const BranchTypeSchema = z.enum(['OFFICE', 'RETAIL', 'LOGISTICS', 'PRODUCTION']);
export const OwnershipTypeSchema = z.enum(['OWNED', 'LEASED', 'MANAGED']);
export const BackupPowerTypeSchema = z.enum(['DIESEL_GEN', 'BATTERY_ESS', 'NONE']);
export const OperatingHoursDTOSchema = z.object({
    weekdays: z.object({
        open: z.string().min(1),
        close: z.string().min(1)
    }),
    weekends: z
        .object({
        open: z.string().min(1),
        close: z.string().min(1)
    })
        .optional()
});
export const BranchManagerDTOSchema = z.object({
    name: z.string().min(1),
    email: z.string().min(3),
    phone: z.string().min(3).optional()
});
/** Legacy: IANA TZ usado por UI / scheduling (no aparece en el constructor Enterprise mínimo; se preserva si existe). */
const timezoneSchema = z.string().min(1).optional();
export const BranchDTOSchema = z.object({
    id: SmsIdSchema,
    organizationId: SmsIdSchema,
    regionId: SmsIdSchema,
    name: z.string().min(1),
    branchCode: z.string().min(1),
    status: BranchStatusSchema.default('ACTIVE'),
    timezone: timezoneSchema,
    branchType: BranchTypeSchema,
    isHeadquarters: z.boolean().default(false),
    constructionYear: z.number().int().min(1000).max(9999),
    renovationYear: z.number().int().min(1000).max(9999).optional(),
    operatingHours: OperatingHoursDTOSchema,
    tags: z.array(z.string().min(1)).default([]),
    ownershipType: OwnershipTypeSchema,
    leaseExpirationDate: z.string().min(1).optional(),
    defaultTariffId: SmsIdSchema.optional(),
    costCenterId: SmsIdSchema.optional(),
    annualEnergyBudget: z.number().nonnegative().optional(),
    localCurrency: z.string().length(3).transform((v) => v.toUpperCase()),
    annualRevenueTarget: z.number().nonnegative().optional(),
    totalFloorAreaM2: z.number().nonnegative(),
    employeeCount: z.number().int().nonnegative(),
    fteEmployees: z.number().nonnegative(),
    openingDaysPerYear: z.number().int().min(1).max(366),
    averageDailyVisitors: z.number().int().nonnegative().optional(),
    energyIntensityTarget: z.number().nonnegative(),
    baseloadThreshold: z.number().nonnegative(),
    peakPowerContracted: z.number().nonnegative(),
    weatherStationId: z.string().min(1).optional(),
    backupPowerType: BackupPowerTypeSchema.default('NONE'),
    fuelTankCapacityLiters: z.number().nonnegative().optional(),
    criticalLoadKw: z.number().nonnegative().optional(),
    hasOnSiteRenewable: z.boolean(),
    renewableCapacityKw: z.number().nonnegative().optional(),
    hasEvCharging: z.boolean(),
    certifications: z.array(z.string().min(1)).default([]),
    hasAirQualityMonitoring: z.boolean().default(false),
    coolingSetPoint: z.number(),
    heatingSetPoint: z.number(),
    branchManager: BranchManagerDTOSchema,
    createdAt: z.string().min(1).optional(),
    updatedAt: z.string().min(1).optional()
});
export class BranchDTO {
    id;
    organizationId;
    regionId;
    name;
    branchCode;
    status;
    branchType;
    isHeadquarters;
    constructionYear;
    renovationYear;
    operatingHours;
    tags;
    ownershipType;
    leaseExpirationDate;
    defaultTariffId;
    costCenterId;
    annualEnergyBudget;
    localCurrency;
    annualRevenueTarget;
    totalFloorAreaM2;
    employeeCount;
    fteEmployees;
    openingDaysPerYear;
    averageDailyVisitors;
    energyIntensityTarget;
    baseloadThreshold;
    peakPowerContracted;
    weatherStationId;
    backupPowerType;
    fuelTankCapacityLiters;
    criticalLoadKw;
    hasOnSiteRenewable;
    renewableCapacityKw;
    hasEvCharging;
    certifications;
    hasAirQualityMonitoring;
    coolingSetPoint;
    heatingSetPoint;
    branchManager;
    createdAt;
    updatedAt;
    /** Legacy/UI: zona horaria IANA cuando exista */
    timezone;
    constructor(id, organizationId, regionId, name, branchCode, status, branchType, isHeadquarters, constructionYear, renovationYear, operatingHours, tags, ownershipType, leaseExpirationDate, defaultTariffId, costCenterId, annualEnergyBudget, localCurrency, annualRevenueTarget, totalFloorAreaM2, employeeCount, fteEmployees, openingDaysPerYear, averageDailyVisitors, energyIntensityTarget, baseloadThreshold, peakPowerContracted, weatherStationId, backupPowerType, fuelTankCapacityLiters, criticalLoadKw, hasOnSiteRenewable, renewableCapacityKw, hasEvCharging, certifications, hasAirQualityMonitoring, coolingSetPoint, heatingSetPoint, branchManager, createdAt, updatedAt, timezone) {
        this.id = id;
        this.organizationId = organizationId;
        this.regionId = regionId;
        this.name = name;
        this.branchCode = branchCode;
        this.status = status ?? 'ACTIVE';
        this.branchType = branchType;
        this.isHeadquarters = isHeadquarters ?? false;
        this.constructionYear = constructionYear;
        if (renovationYear !== null && renovationYear !== undefined)
            this.renovationYear = renovationYear;
        this.operatingHours = operatingHours;
        this.tags = Array.isArray(tags) ? tags : [];
        this.ownershipType = ownershipType;
        if (leaseExpirationDate?.trim())
            this.leaseExpirationDate = leaseExpirationDate.trim();
        if (defaultTariffId?.trim())
            this.defaultTariffId = defaultTariffId.trim();
        if (costCenterId?.trim())
            this.costCenterId = costCenterId.trim();
        if (annualEnergyBudget !== null && annualEnergyBudget !== undefined)
            this.annualEnergyBudget = annualEnergyBudget;
        this.localCurrency = localCurrency;
        if (annualRevenueTarget !== null && annualRevenueTarget !== undefined)
            this.annualRevenueTarget = annualRevenueTarget;
        this.totalFloorAreaM2 = totalFloorAreaM2;
        this.employeeCount = employeeCount;
        this.fteEmployees = fteEmployees;
        this.openingDaysPerYear = openingDaysPerYear;
        if (averageDailyVisitors !== null && averageDailyVisitors !== undefined)
            this.averageDailyVisitors = averageDailyVisitors;
        this.energyIntensityTarget = energyIntensityTarget;
        this.baseloadThreshold = baseloadThreshold;
        this.peakPowerContracted = peakPowerContracted;
        if (weatherStationId?.trim())
            this.weatherStationId = weatherStationId.trim();
        this.backupPowerType = backupPowerType ?? 'NONE';
        if (fuelTankCapacityLiters !== null && fuelTankCapacityLiters !== undefined)
            this.fuelTankCapacityLiters = fuelTankCapacityLiters;
        if (criticalLoadKw !== null && criticalLoadKw !== undefined)
            this.criticalLoadKw = criticalLoadKw;
        this.hasOnSiteRenewable = hasOnSiteRenewable;
        if (renewableCapacityKw !== null && renewableCapacityKw !== undefined)
            this.renewableCapacityKw = renewableCapacityKw;
        this.hasEvCharging = hasEvCharging;
        this.certifications = Array.isArray(certifications) ? certifications : [];
        this.hasAirQualityMonitoring = hasAirQualityMonitoring ?? false;
        this.coolingSetPoint = coolingSetPoint;
        this.heatingSetPoint = heatingSetPoint;
        this.branchManager = branchManager;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        if (timezone?.trim())
            this.timezone = timezone.trim();
    }
}
export const parseBranchDTO = (input) => {
    const dto = BranchDTOSchema.parse(input);
    return new BranchDTO(dto.id, dto.organizationId, dto.regionId, dto.name, dto.branchCode, dto.status, dto.branchType, dto.isHeadquarters, dto.constructionYear, dto.renovationYear, dto.operatingHours, dto.tags, dto.ownershipType, dto.leaseExpirationDate, dto.defaultTariffId, dto.costCenterId, dto.annualEnergyBudget, dto.localCurrency, dto.annualRevenueTarget, dto.totalFloorAreaM2, dto.employeeCount, dto.fteEmployees, dto.openingDaysPerYear, dto.averageDailyVisitors, dto.energyIntensityTarget, dto.baseloadThreshold, dto.peakPowerContracted, dto.weatherStationId, dto.backupPowerType, dto.fuelTankCapacityLiters, dto.criticalLoadKw, dto.hasOnSiteRenewable, dto.renewableCapacityKw, dto.hasEvCharging, dto.certifications, dto.hasAirQualityMonitoring, dto.coolingSetPoint, dto.heatingSetPoint, dto.branchManager, dto.createdAt, dto.updatedAt, dto.timezone);
};
export const safeParseBranchDTO = (input) => BranchDTOSchema.safeParse(input);
//# sourceMappingURL=branch.dto.js.map