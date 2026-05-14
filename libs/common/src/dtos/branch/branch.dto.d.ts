import { z } from 'zod';
export declare const BranchStatusSchema: z.ZodEnum<["ACTIVE", "INACTIVE", "CONSTRUCTION"]>;
export declare const BranchTypeSchema: z.ZodEnum<["OFFICE", "RETAIL", "LOGISTICS", "PRODUCTION"]>;
export declare const OwnershipTypeSchema: z.ZodEnum<["OWNED", "LEASED", "MANAGED"]>;
export declare const BackupPowerTypeSchema: z.ZodEnum<["DIESEL_GEN", "BATTERY_ESS", "NONE"]>;
export type BranchStatus = z.infer<typeof BranchStatusSchema>;
export type BranchType = z.infer<typeof BranchTypeSchema>;
export type OwnershipType = z.infer<typeof OwnershipTypeSchema>;
export type BackupPowerType = z.infer<typeof BackupPowerTypeSchema>;
export declare const OperatingHoursDTOSchema: z.ZodObject<{
    weekdays: z.ZodObject<{
        open: z.ZodString;
        close: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        open: string;
        close: string;
    }, {
        open: string;
        close: string;
    }>;
    weekends: z.ZodOptional<z.ZodObject<{
        open: z.ZodString;
        close: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        open: string;
        close: string;
    }, {
        open: string;
        close: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    weekdays: {
        open: string;
        close: string;
    };
    weekends?: {
        open: string;
        close: string;
    } | undefined;
}, {
    weekdays: {
        open: string;
        close: string;
    };
    weekends?: {
        open: string;
        close: string;
    } | undefined;
}>;
export declare const BranchManagerDTOSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    phone?: string | undefined;
}, {
    name: string;
    email: string;
    phone?: string | undefined;
}>;
export declare const BranchDTOSchema: z.ZodObject<{
    id: z.ZodUnion<[z.ZodString, z.ZodString]>;
    organizationId: z.ZodUnion<[z.ZodString, z.ZodString]>;
    regionId: z.ZodUnion<[z.ZodString, z.ZodString]>;
    name: z.ZodString;
    branchCode: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "INACTIVE", "CONSTRUCTION"]>>;
    timezone: z.ZodOptional<z.ZodString>;
    branchType: z.ZodEnum<["OFFICE", "RETAIL", "LOGISTICS", "PRODUCTION"]>;
    isHeadquarters: z.ZodDefault<z.ZodBoolean>;
    constructionYear: z.ZodNumber;
    renovationYear: z.ZodOptional<z.ZodNumber>;
    operatingHours: z.ZodObject<{
        weekdays: z.ZodObject<{
            open: z.ZodString;
            close: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            open: string;
            close: string;
        }, {
            open: string;
            close: string;
        }>;
        weekends: z.ZodOptional<z.ZodObject<{
            open: z.ZodString;
            close: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            open: string;
            close: string;
        }, {
            open: string;
            close: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        weekdays: {
            open: string;
            close: string;
        };
        weekends?: {
            open: string;
            close: string;
        } | undefined;
    }, {
        weekdays: {
            open: string;
            close: string;
        };
        weekends?: {
            open: string;
            close: string;
        } | undefined;
    }>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    ownershipType: z.ZodEnum<["OWNED", "LEASED", "MANAGED"]>;
    leaseExpirationDate: z.ZodOptional<z.ZodString>;
    defaultTariffId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    costCenterId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    annualEnergyBudget: z.ZodOptional<z.ZodNumber>;
    localCurrency: z.ZodEffects<z.ZodString, string, string>;
    annualRevenueTarget: z.ZodOptional<z.ZodNumber>;
    totalFloorAreaM2: z.ZodNumber;
    employeeCount: z.ZodNumber;
    fteEmployees: z.ZodNumber;
    openingDaysPerYear: z.ZodNumber;
    averageDailyVisitors: z.ZodOptional<z.ZodNumber>;
    energyIntensityTarget: z.ZodNumber;
    baseloadThreshold: z.ZodNumber;
    peakPowerContracted: z.ZodNumber;
    weatherStationId: z.ZodOptional<z.ZodString>;
    backupPowerType: z.ZodDefault<z.ZodEnum<["DIESEL_GEN", "BATTERY_ESS", "NONE"]>>;
    fuelTankCapacityLiters: z.ZodOptional<z.ZodNumber>;
    criticalLoadKw: z.ZodOptional<z.ZodNumber>;
    hasOnSiteRenewable: z.ZodBoolean;
    renewableCapacityKw: z.ZodOptional<z.ZodNumber>;
    hasEvCharging: z.ZodBoolean;
    certifications: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    hasAirQualityMonitoring: z.ZodDefault<z.ZodBoolean>;
    coolingSetPoint: z.ZodNumber;
    heatingSetPoint: z.ZodNumber;
    branchManager: z.ZodObject<{
        name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        email: string;
        phone?: string | undefined;
    }, {
        name: string;
        email: string;
        phone?: string | undefined;
    }>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "INACTIVE" | "ACTIVE" | "CONSTRUCTION";
    name: string;
    id: string;
    organizationId: string;
    regionId: string;
    branchCode: string;
    branchType: "OFFICE" | "RETAIL" | "LOGISTICS" | "PRODUCTION";
    isHeadquarters: boolean;
    constructionYear: number;
    operatingHours: {
        weekdays: {
            open: string;
            close: string;
        };
        weekends?: {
            open: string;
            close: string;
        } | undefined;
    };
    tags: string[];
    ownershipType: "OWNED" | "LEASED" | "MANAGED";
    localCurrency: string;
    totalFloorAreaM2: number;
    employeeCount: number;
    fteEmployees: number;
    openingDaysPerYear: number;
    energyIntensityTarget: number;
    baseloadThreshold: number;
    peakPowerContracted: number;
    backupPowerType: "NONE" | "DIESEL_GEN" | "BATTERY_ESS";
    hasOnSiteRenewable: boolean;
    hasEvCharging: boolean;
    certifications: string[];
    hasAirQualityMonitoring: boolean;
    coolingSetPoint: number;
    heatingSetPoint: number;
    branchManager: {
        name: string;
        email: string;
        phone?: string | undefined;
    };
    timezone?: string | undefined;
    annualRevenueTarget?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    renovationYear?: number | undefined;
    leaseExpirationDate?: string | undefined;
    defaultTariffId?: string | undefined;
    costCenterId?: string | undefined;
    annualEnergyBudget?: number | undefined;
    averageDailyVisitors?: number | undefined;
    weatherStationId?: string | undefined;
    fuelTankCapacityLiters?: number | undefined;
    criticalLoadKw?: number | undefined;
    renewableCapacityKw?: number | undefined;
}, {
    name: string;
    id: string;
    organizationId: string;
    regionId: string;
    branchCode: string;
    branchType: "OFFICE" | "RETAIL" | "LOGISTICS" | "PRODUCTION";
    constructionYear: number;
    operatingHours: {
        weekdays: {
            open: string;
            close: string;
        };
        weekends?: {
            open: string;
            close: string;
        } | undefined;
    };
    ownershipType: "OWNED" | "LEASED" | "MANAGED";
    localCurrency: string;
    totalFloorAreaM2: number;
    employeeCount: number;
    fteEmployees: number;
    openingDaysPerYear: number;
    energyIntensityTarget: number;
    baseloadThreshold: number;
    peakPowerContracted: number;
    hasOnSiteRenewable: boolean;
    hasEvCharging: boolean;
    coolingSetPoint: number;
    heatingSetPoint: number;
    branchManager: {
        name: string;
        email: string;
        phone?: string | undefined;
    };
    status?: "INACTIVE" | "ACTIVE" | "CONSTRUCTION" | undefined;
    timezone?: string | undefined;
    annualRevenueTarget?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    isHeadquarters?: boolean | undefined;
    renovationYear?: number | undefined;
    tags?: string[] | undefined;
    leaseExpirationDate?: string | undefined;
    defaultTariffId?: string | undefined;
    costCenterId?: string | undefined;
    annualEnergyBudget?: number | undefined;
    averageDailyVisitors?: number | undefined;
    weatherStationId?: string | undefined;
    backupPowerType?: "NONE" | "DIESEL_GEN" | "BATTERY_ESS" | undefined;
    fuelTankCapacityLiters?: number | undefined;
    criticalLoadKw?: number | undefined;
    renewableCapacityKw?: number | undefined;
    certifications?: string[] | undefined;
    hasAirQualityMonitoring?: boolean | undefined;
}>;
export declare class BranchDTO {
    readonly id: string;
    readonly organizationId: string;
    readonly regionId: string;
    readonly name: string;
    readonly branchCode: string;
    readonly status: z.infer<typeof BranchStatusSchema>;
    readonly branchType: z.infer<typeof BranchTypeSchema>;
    readonly isHeadquarters: boolean;
    readonly constructionYear: number;
    readonly renovationYear?: number;
    readonly operatingHours: z.infer<typeof OperatingHoursDTOSchema>;
    readonly tags: string[];
    readonly ownershipType: z.infer<typeof OwnershipTypeSchema>;
    readonly leaseExpirationDate?: string;
    readonly defaultTariffId?: string;
    readonly costCenterId?: string;
    readonly annualEnergyBudget?: number;
    readonly localCurrency: string;
    readonly annualRevenueTarget?: number;
    readonly totalFloorAreaM2: number;
    readonly employeeCount: number;
    readonly fteEmployees: number;
    readonly openingDaysPerYear: number;
    readonly averageDailyVisitors?: number;
    readonly energyIntensityTarget: number;
    readonly baseloadThreshold: number;
    readonly peakPowerContracted: number;
    readonly weatherStationId?: string;
    readonly backupPowerType: z.infer<typeof BackupPowerTypeSchema>;
    readonly fuelTankCapacityLiters?: number;
    readonly criticalLoadKw?: number;
    readonly hasOnSiteRenewable: boolean;
    readonly renewableCapacityKw?: number;
    readonly hasEvCharging: boolean;
    readonly certifications: string[];
    readonly hasAirQualityMonitoring: boolean;
    readonly coolingSetPoint: number;
    readonly heatingSetPoint: number;
    readonly branchManager: {
        name: string;
        email: string;
        phone?: string;
    };
    readonly createdAt?: string;
    readonly updatedAt?: string;
    /** Legacy/UI: zona horaria IANA cuando exista */
    readonly timezone?: string;
    constructor(id: string, organizationId: string, regionId: string, name: string, branchCode: string, status: z.infer<typeof BranchStatusSchema> | null | undefined, branchType: z.infer<typeof BranchTypeSchema>, isHeadquarters: boolean | null | undefined, constructionYear: number, renovationYear: number | null | undefined, operatingHours: z.infer<typeof OperatingHoursDTOSchema>, tags: string[] | null | undefined, ownershipType: z.infer<typeof OwnershipTypeSchema>, leaseExpirationDate: string | null | undefined, defaultTariffId: string | null | undefined, costCenterId: string | null | undefined, annualEnergyBudget: number | null | undefined, localCurrency: string, annualRevenueTarget: number | null | undefined, totalFloorAreaM2: number, employeeCount: number, fteEmployees: number, openingDaysPerYear: number, averageDailyVisitors: number | null | undefined, energyIntensityTarget: number, baseloadThreshold: number, peakPowerContracted: number, weatherStationId: string | null | undefined, backupPowerType: z.infer<typeof BackupPowerTypeSchema> | null | undefined, fuelTankCapacityLiters: number | null | undefined, criticalLoadKw: number | null | undefined, hasOnSiteRenewable: boolean, renewableCapacityKw: number | null | undefined, hasEvCharging: boolean, certifications: string[] | null | undefined, hasAirQualityMonitoring: boolean | null | undefined, coolingSetPoint: number, heatingSetPoint: number, branchManager: {
        name: string;
        email: string;
        phone?: string;
    }, createdAt?: string, updatedAt?: string, timezone?: string);
}
export type BranchDTOInput = z.infer<typeof BranchDTOSchema>;
export declare const parseBranchDTO: (input: unknown) => BranchDTO;
export declare const safeParseBranchDTO: (input: unknown) => z.SafeParseReturnType<{
    name: string;
    id: string;
    organizationId: string;
    regionId: string;
    branchCode: string;
    branchType: "OFFICE" | "RETAIL" | "LOGISTICS" | "PRODUCTION";
    constructionYear: number;
    operatingHours: {
        weekdays: {
            open: string;
            close: string;
        };
        weekends?: {
            open: string;
            close: string;
        } | undefined;
    };
    ownershipType: "OWNED" | "LEASED" | "MANAGED";
    localCurrency: string;
    totalFloorAreaM2: number;
    employeeCount: number;
    fteEmployees: number;
    openingDaysPerYear: number;
    energyIntensityTarget: number;
    baseloadThreshold: number;
    peakPowerContracted: number;
    hasOnSiteRenewable: boolean;
    hasEvCharging: boolean;
    coolingSetPoint: number;
    heatingSetPoint: number;
    branchManager: {
        name: string;
        email: string;
        phone?: string | undefined;
    };
    status?: "INACTIVE" | "ACTIVE" | "CONSTRUCTION" | undefined;
    timezone?: string | undefined;
    annualRevenueTarget?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    isHeadquarters?: boolean | undefined;
    renovationYear?: number | undefined;
    tags?: string[] | undefined;
    leaseExpirationDate?: string | undefined;
    defaultTariffId?: string | undefined;
    costCenterId?: string | undefined;
    annualEnergyBudget?: number | undefined;
    averageDailyVisitors?: number | undefined;
    weatherStationId?: string | undefined;
    backupPowerType?: "NONE" | "DIESEL_GEN" | "BATTERY_ESS" | undefined;
    fuelTankCapacityLiters?: number | undefined;
    criticalLoadKw?: number | undefined;
    renewableCapacityKw?: number | undefined;
    certifications?: string[] | undefined;
    hasAirQualityMonitoring?: boolean | undefined;
}, {
    status: "INACTIVE" | "ACTIVE" | "CONSTRUCTION";
    name: string;
    id: string;
    organizationId: string;
    regionId: string;
    branchCode: string;
    branchType: "OFFICE" | "RETAIL" | "LOGISTICS" | "PRODUCTION";
    isHeadquarters: boolean;
    constructionYear: number;
    operatingHours: {
        weekdays: {
            open: string;
            close: string;
        };
        weekends?: {
            open: string;
            close: string;
        } | undefined;
    };
    tags: string[];
    ownershipType: "OWNED" | "LEASED" | "MANAGED";
    localCurrency: string;
    totalFloorAreaM2: number;
    employeeCount: number;
    fteEmployees: number;
    openingDaysPerYear: number;
    energyIntensityTarget: number;
    baseloadThreshold: number;
    peakPowerContracted: number;
    backupPowerType: "NONE" | "DIESEL_GEN" | "BATTERY_ESS";
    hasOnSiteRenewable: boolean;
    hasEvCharging: boolean;
    certifications: string[];
    hasAirQualityMonitoring: boolean;
    coolingSetPoint: number;
    heatingSetPoint: number;
    branchManager: {
        name: string;
        email: string;
        phone?: string | undefined;
    };
    timezone?: string | undefined;
    annualRevenueTarget?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    renovationYear?: number | undefined;
    leaseExpirationDate?: string | undefined;
    defaultTariffId?: string | undefined;
    costCenterId?: string | undefined;
    annualEnergyBudget?: number | undefined;
    averageDailyVisitors?: number | undefined;
    weatherStationId?: string | undefined;
    fuelTankCapacityLiters?: number | undefined;
    criticalLoadKw?: number | undefined;
    renewableCapacityKw?: number | undefined;
}>;
//# sourceMappingURL=branch.dto.d.ts.map