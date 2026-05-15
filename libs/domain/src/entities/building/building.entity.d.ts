import type { BuildingUsageType, HvacType, MainFuelType, OperationalStatus } from '@sms/common';
import type { GeoCoordinatesDTO } from '@sms/common';
import { BuildingDTO } from '@sms/common';
/** Nivel 4 — activo físico bajo Branch. */
export declare class BuildingEntity {
    readonly id: string;
    readonly organizationId: string;
    readonly regionId: string;
    readonly branchId: string;
    readonly name: string;
    readonly status: OperationalStatus;
    readonly usageTypeEnum: BuildingUsageType;
    readonly m2Surface: number;
    readonly m3Volume: number;
    readonly footprintM2?: number;
    readonly floorsCount: number;
    readonly yearBuilt: number;
    readonly renovationYear?: number;
    readonly insulationQuality: 'POOR' | 'AVERAGE' | 'HIGH';
    readonly windowWallRatio: number;
    readonly roofType: 'GREEN' | 'REFLECTIVE' | 'STANDARD';
    readonly coordinates: GeoCoordinatesDTO;
    readonly hvacType: HvacType;
    readonly hvacAgeYears?: number;
    readonly hvacEfficiencyRating?: number;
    readonly maintenanceStatus: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
    readonly lastEnergyAuditDate?: string;
    readonly mainFuelType: MainFuelType;
    readonly lightingTechnology: 'LED' | 'FLUORESCENT' | 'HID' | 'MIXED';
    readonly lightingPowerDensity?: number;
    readonly hasBms: boolean;
    readonly bmsVendor?: string;
    readonly bmsProtocols: readonly string[];
    readonly hasSmartMetering: boolean;
    readonly dataGranularity: 'MANUAL' | 'MONTHLY' | 'DAILY' | 'TELEMETRY';
    readonly submeteringTopology: 'CENTRALIZED' | 'BY_FLOOR' | 'BY_LOAD' | 'NONE';
    readonly buildingCertifications: readonly string[];
    readonly epcRating?: string;
    readonly onsiteGenerationCapacityKw?: number;
    readonly airQualitySensors: boolean;
    readonly waterRecyclingSystem: boolean;
    readonly evChargingPoints: number;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    /** Legacy */
    readonly usageType?: string;
    constructor(id: string, organizationId: string, regionId: string, branchId: string, name: string, status: OperationalStatus, usageTypeEnum: BuildingUsageType, m2Surface: number, m3Volume: number, footprintM2: number | undefined, floorsCount: number, yearBuilt: number, renovationYear: number | undefined, insulationQuality: 'POOR' | 'AVERAGE' | 'HIGH', windowWallRatio: number, roofType: 'GREEN' | 'REFLECTIVE' | 'STANDARD', coordinates: GeoCoordinatesDTO, hvacType: HvacType, hvacAgeYears: number | undefined, hvacEfficiencyRating: number | undefined, maintenanceStatus: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL', lastEnergyAuditDate: string | undefined, mainFuelType: MainFuelType, lightingTechnology: 'LED' | 'FLUORESCENT' | 'HID' | 'MIXED', lightingPowerDensity: number | undefined, hasBms: boolean, bmsVendor: string | undefined, bmsProtocols: readonly string[], hasSmartMetering: boolean, dataGranularity: 'MANUAL' | 'MONTHLY' | 'DAILY' | 'TELEMETRY', submeteringTopology: 'CENTRALIZED' | 'BY_FLOOR' | 'BY_LOAD' | 'NONE', buildingCertifications: readonly string[], epcRating: string | undefined, onsiteGenerationCapacityKw: number | undefined, airQualitySensors: boolean, waterRecyclingSystem: boolean, evChargingPoints: number, createdAt?: string, updatedAt?: string, usageType?: string);
    static fromDTO(dto: BuildingDTO): BuildingEntity;
    assertBelongsToBranch(expectedBranchId: string): void;
    assertHierarchy(): void;
    toValue(): BuildingDTO;
}
//# sourceMappingURL=building.entity.d.ts.map