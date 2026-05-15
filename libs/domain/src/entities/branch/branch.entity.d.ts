import { BranchDTO } from '@sms/common';
/** Nivel 3 — sucursal / planta bajo una Region. */
export declare class BranchEntity {
    readonly id: string;
    readonly organizationId: string;
    readonly regionId: string;
    readonly name: string;
    readonly branchCode: string;
    readonly status: BranchDTO['status'];
    readonly branchType: BranchDTO['branchType'];
    readonly isHeadquarters: boolean;
    readonly constructionYear: number;
    readonly renovationYear: number | undefined;
    readonly operatingHours: BranchDTO['operatingHours'];
    readonly tags: readonly string[];
    readonly ownershipType: BranchDTO['ownershipType'];
    readonly leaseExpirationDate: string | undefined;
    readonly defaultTariffId: string | undefined;
    readonly costCenterId: string | undefined;
    readonly annualEnergyBudget: number | undefined;
    readonly localCurrency: string;
    readonly annualRevenueTarget: number | undefined;
    readonly totalFloorAreaM2: number;
    readonly employeeCount: number;
    readonly fteEmployees: number;
    readonly openingDaysPerYear: number;
    readonly averageDailyVisitors: number | undefined;
    readonly energyIntensityTarget: number;
    readonly baseloadThreshold: number;
    readonly peakPowerContracted: number;
    readonly weatherStationId: string | undefined;
    readonly backupPowerType: BranchDTO['backupPowerType'];
    readonly fuelTankCapacityLiters: number | undefined;
    readonly criticalLoadKw: number | undefined;
    readonly hasOnSiteRenewable: boolean;
    readonly renewableCapacityKw: number | undefined;
    readonly hasEvCharging: boolean;
    readonly certifications: readonly string[];
    readonly hasAirQualityMonitoring: boolean;
    readonly coolingSetPoint: number;
    readonly heatingSetPoint: number;
    readonly branchManager: BranchDTO['branchManager'];
    readonly createdAt?: string | undefined;
    readonly updatedAt?: string | undefined;
    /** Legacy persistencia/UI */
    readonly timezone?: string | undefined;
    constructor(id: string, organizationId: string, regionId: string, name: string, branchCode: string, status: BranchDTO['status'], branchType: BranchDTO['branchType'], isHeadquarters: boolean, constructionYear: number, renovationYear: number | undefined, operatingHours: BranchDTO['operatingHours'], tags: readonly string[], ownershipType: BranchDTO['ownershipType'], leaseExpirationDate: string | undefined, defaultTariffId: string | undefined, costCenterId: string | undefined, annualEnergyBudget: number | undefined, localCurrency: string, annualRevenueTarget: number | undefined, totalFloorAreaM2: number, employeeCount: number, fteEmployees: number, openingDaysPerYear: number, averageDailyVisitors: number | undefined, energyIntensityTarget: number, baseloadThreshold: number, peakPowerContracted: number, weatherStationId: string | undefined, backupPowerType: BranchDTO['backupPowerType'], fuelTankCapacityLiters: number | undefined, criticalLoadKw: number | undefined, hasOnSiteRenewable: boolean, renewableCapacityKw: number | undefined, hasEvCharging: boolean, certifications: readonly string[], hasAirQualityMonitoring: boolean, coolingSetPoint: number, heatingSetPoint: number, branchManager: BranchDTO['branchManager'], createdAt?: string | undefined, updatedAt?: string | undefined, 
    /** Legacy persistencia/UI */
    timezone?: string | undefined);
    static fromDTO(dto: BranchDTO): BranchEntity;
    assertBelongsToRegion(expectedRegionId: string): void;
    assertHierarchy(): void;
    toValue(): BranchDTO;
}
//# sourceMappingURL=branch.entity.d.ts.map