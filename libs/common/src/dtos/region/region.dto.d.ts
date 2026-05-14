import { z } from 'zod';
import { LifecycleStatusSchema } from '../shared/graphql-setup-enums.js';
export declare const ClimateZoneSchema: z.ZodEnum<["TROPICAL", "DRY", "TEMPERATE", "CONTINENTAL", "POLAR"]>;
export declare const CarbonMarketTypeSchema: z.ZodEnum<["TAX", "ETS", "NONE"]>;
export declare const MaturityLevelSchema: z.ZodEnum<["MANUAL", "SEMIAUTOMATED", "IOT_READY"]>;
export declare const EconomicAreaSchema: z.ZodEnum<["EMEA", "LATAM", "APAC", "NA"]>;
export type ClimateZone = z.infer<typeof ClimateZoneSchema>;
export type CarbonMarketType = z.infer<typeof CarbonMarketTypeSchema>;
export type MaturityLevel = z.infer<typeof MaturityLevelSchema>;
export type EconomicArea = z.infer<typeof EconomicAreaSchema>;
export declare const RegionalManagerDTOSchema: z.ZodObject<{
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
export declare const RegionDTOSchema: z.ZodObject<{
    id: z.ZodUnion<[z.ZodString, z.ZodString]>;
    organizationId: z.ZodUnion<[z.ZodString, z.ZodString]>;
    name: z.ZodString;
    code: z.ZodString;
    countryCode: z.ZodString;
    timezone: z.ZodString;
    coordinates: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
    }, {
        lat: number;
        lng: number;
    }>;
    climateZone: z.ZodEnum<["TROPICAL", "DRY", "TEMPERATE", "CONTINENTAL", "POLAR"]>;
    avgHDD: z.ZodDefault<z.ZodNumber>;
    avgCDD: z.ZodDefault<z.ZodNumber>;
    totalRegionalM2: z.ZodDefault<z.ZodNumber>;
    totalHeadcount: z.ZodDefault<z.ZodNumber>;
    annualRevenueTarget: z.ZodOptional<z.ZodNumber>;
    gridEmissionFactor: z.ZodDefault<z.ZodNumber>;
    carbonTaxRate: z.ZodDefault<z.ZodNumber>;
    carbonMarketType: z.ZodDefault<z.ZodEnum<["TAX", "ETS", "NONE"]>>;
    marginalAbatementCost: z.ZodDefault<z.ZodNumber>;
    renewableEnergyAvailability: z.ZodDefault<z.ZodNumber>;
    gridRenewableShare: z.ZodDefault<z.ZodNumber>;
    waterStressIndex: z.ZodDefault<z.ZodNumber>;
    localRegulations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    maturityLevel: z.ZodEnum<["MANUAL", "SEMIAUTOMATED", "IOT_READY"]>;
    economicArea: z.ZodEnum<["EMEA", "LATAM", "APAC", "NA"]>;
    regionalManager: z.ZodObject<{
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
    regionalReductionTarget: z.ZodDefault<z.ZodNumber>;
    energyScarcityRisk: z.ZodDefault<z.ZodNumber>;
    status: z.ZodEffects<z.ZodDefault<z.ZodEnum<["ACTIVE", "INACTIVE"]>>, "INACTIVE" | "ACTIVE", unknown>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
    /**
     * Legacy/back-compat (UI antigua). Se mantiene para no romper modelos en memoria.
     * No forma parte del estándar Enterprise.
     */
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    status: "INACTIVE" | "ACTIVE";
    countryCode: string;
    name: string;
    id: string;
    organizationId: string;
    timezone: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    climateZone: "TROPICAL" | "DRY" | "TEMPERATE" | "CONTINENTAL" | "POLAR";
    avgHDD: number;
    avgCDD: number;
    totalRegionalM2: number;
    totalHeadcount: number;
    gridEmissionFactor: number;
    carbonTaxRate: number;
    carbonMarketType: "TAX" | "ETS" | "NONE";
    marginalAbatementCost: number;
    renewableEnergyAvailability: number;
    gridRenewableShare: number;
    waterStressIndex: number;
    localRegulations: string[];
    maturityLevel: "MANUAL" | "SEMIAUTOMATED" | "IOT_READY";
    economicArea: "EMEA" | "LATAM" | "APAC" | "NA";
    regionalManager: {
        name: string;
        email: string;
        phone?: string | undefined;
    };
    regionalReductionTarget: number;
    energyScarcityRisk: number;
    annualRevenueTarget?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    description?: string | undefined;
}, {
    code: string;
    countryCode: string;
    name: string;
    id: string;
    organizationId: string;
    timezone: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    climateZone: "TROPICAL" | "DRY" | "TEMPERATE" | "CONTINENTAL" | "POLAR";
    maturityLevel: "MANUAL" | "SEMIAUTOMATED" | "IOT_READY";
    economicArea: "EMEA" | "LATAM" | "APAC" | "NA";
    regionalManager: {
        name: string;
        email: string;
        phone?: string | undefined;
    };
    status?: unknown;
    avgHDD?: number | undefined;
    avgCDD?: number | undefined;
    totalRegionalM2?: number | undefined;
    totalHeadcount?: number | undefined;
    annualRevenueTarget?: number | undefined;
    gridEmissionFactor?: number | undefined;
    carbonTaxRate?: number | undefined;
    carbonMarketType?: "TAX" | "ETS" | "NONE" | undefined;
    marginalAbatementCost?: number | undefined;
    renewableEnergyAvailability?: number | undefined;
    gridRenewableShare?: number | undefined;
    waterStressIndex?: number | undefined;
    localRegulations?: string[] | undefined;
    regionalReductionTarget?: number | undefined;
    energyScarcityRisk?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    description?: string | undefined;
}>;
export declare class RegionDTO {
    readonly id: string;
    readonly organizationId: string;
    readonly name: string;
    readonly code: string;
    readonly countryCode: string;
    readonly timezone: string;
    readonly coordinates: {
        lat: number;
        lng: number;
    };
    readonly climateZone: ClimateZone;
    readonly avgHDD: number;
    readonly avgCDD: number;
    readonly totalRegionalM2: number;
    readonly totalHeadcount: number;
    readonly annualRevenueTarget?: number;
    readonly gridEmissionFactor: number;
    readonly carbonTaxRate: number;
    readonly carbonMarketType: CarbonMarketType;
    readonly marginalAbatementCost: number;
    readonly renewableEnergyAvailability: number;
    readonly gridRenewableShare: number;
    readonly waterStressIndex: number;
    readonly localRegulations: string[];
    readonly maturityLevel: MaturityLevel;
    readonly economicArea: EconomicArea;
    readonly regionalManager: {
        name: string;
        email: string;
        phone?: string;
    };
    readonly regionalReductionTarget: number;
    readonly energyScarcityRisk: number;
    readonly status: z.infer<typeof LifecycleStatusSchema>;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    /** Legacy/back-compat (UI antigua). */
    readonly description?: string;
    constructor(id: string, organizationId: string, name: string, code: string, countryCode: string, timezone: string, coordinates: {
        lat: number;
        lng: number;
    }, climateZone: ClimateZone, avgHDD: number | null | undefined, avgCDD: number | null | undefined, totalRegionalM2: number | null | undefined, totalHeadcount: number | null | undefined, annualRevenueTarget: number | null | undefined, gridEmissionFactor: number | null | undefined, carbonTaxRate: number | null | undefined, carbonMarketType: CarbonMarketType | null | undefined, marginalAbatementCost: number | null | undefined, renewableEnergyAvailability: number | null | undefined, gridRenewableShare: number | null | undefined, waterStressIndex: number | null | undefined, localRegulations: string[] | null | undefined, maturityLevel: MaturityLevel, economicArea: EconomicArea, regionalManager: {
        name: string;
        email: string;
        phone?: string;
    }, regionalReductionTarget: number | null | undefined, energyScarcityRisk: number | null | undefined, status: z.infer<typeof LifecycleStatusSchema> | null | undefined, createdAt?: string, updatedAt?: string, description?: string);
}
export type RegionDTOInput = z.infer<typeof RegionDTOSchema>;
export declare const parseRegionDTO: (input: unknown) => RegionDTO;
export declare const safeParseRegionDTO: (input: unknown) => z.SafeParseReturnType<{
    code: string;
    countryCode: string;
    name: string;
    id: string;
    organizationId: string;
    timezone: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    climateZone: "TROPICAL" | "DRY" | "TEMPERATE" | "CONTINENTAL" | "POLAR";
    maturityLevel: "MANUAL" | "SEMIAUTOMATED" | "IOT_READY";
    economicArea: "EMEA" | "LATAM" | "APAC" | "NA";
    regionalManager: {
        name: string;
        email: string;
        phone?: string | undefined;
    };
    status?: unknown;
    avgHDD?: number | undefined;
    avgCDD?: number | undefined;
    totalRegionalM2?: number | undefined;
    totalHeadcount?: number | undefined;
    annualRevenueTarget?: number | undefined;
    gridEmissionFactor?: number | undefined;
    carbonTaxRate?: number | undefined;
    carbonMarketType?: "TAX" | "ETS" | "NONE" | undefined;
    marginalAbatementCost?: number | undefined;
    renewableEnergyAvailability?: number | undefined;
    gridRenewableShare?: number | undefined;
    waterStressIndex?: number | undefined;
    localRegulations?: string[] | undefined;
    regionalReductionTarget?: number | undefined;
    energyScarcityRisk?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    description?: string | undefined;
}, {
    code: string;
    status: "INACTIVE" | "ACTIVE";
    countryCode: string;
    name: string;
    id: string;
    organizationId: string;
    timezone: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    climateZone: "TROPICAL" | "DRY" | "TEMPERATE" | "CONTINENTAL" | "POLAR";
    avgHDD: number;
    avgCDD: number;
    totalRegionalM2: number;
    totalHeadcount: number;
    gridEmissionFactor: number;
    carbonTaxRate: number;
    carbonMarketType: "TAX" | "ETS" | "NONE";
    marginalAbatementCost: number;
    renewableEnergyAvailability: number;
    gridRenewableShare: number;
    waterStressIndex: number;
    localRegulations: string[];
    maturityLevel: "MANUAL" | "SEMIAUTOMATED" | "IOT_READY";
    economicArea: "EMEA" | "LATAM" | "APAC" | "NA";
    regionalManager: {
        name: string;
        email: string;
        phone?: string | undefined;
    };
    regionalReductionTarget: number;
    energyScarcityRisk: number;
    annualRevenueTarget?: number | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    description?: string | undefined;
}>;
//# sourceMappingURL=region.dto.d.ts.map