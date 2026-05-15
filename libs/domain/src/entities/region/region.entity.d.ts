import type { LifecycleStatus } from '@sms/common';
import type { GeoCoordinatesDTO } from '@sms/common';
import { RegionDTO } from '@sms/common';
/** Nivel 2 — agrupa sucursales geopolíticas / compliance. */
export declare class RegionEntity {
    readonly id: string;
    readonly organizationId: string;
    readonly name: string;
    readonly code: string;
    readonly countryCode: string;
    readonly timezone: string;
    readonly coordinates: GeoCoordinatesDTO;
    readonly climateZone: RegionDTO['climateZone'];
    readonly avgHDD: number;
    readonly avgCDD: number;
    readonly totalRegionalM2: number;
    readonly totalHeadcount: number;
    readonly annualRevenueTarget: number | undefined;
    readonly gridEmissionFactor: number;
    readonly carbonTaxRate: number;
    readonly carbonMarketType: RegionDTO['carbonMarketType'];
    readonly marginalAbatementCost: number;
    readonly renewableEnergyAvailability: number;
    readonly gridRenewableShare: number;
    readonly waterStressIndex: number;
    readonly localRegulations: readonly string[];
    readonly maturityLevel: RegionDTO['maturityLevel'];
    readonly economicArea: RegionDTO['economicArea'];
    readonly regionalManager: RegionDTO['regionalManager'];
    readonly regionalReductionTarget: number;
    readonly energyScarcityRisk: number;
    readonly status: LifecycleStatus;
    readonly description?: string | undefined;
    readonly createdAt?: string | undefined;
    readonly updatedAt?: string | undefined;
    constructor(id: string, organizationId: string, name: string, code: string, countryCode: string, timezone: string, coordinates: GeoCoordinatesDTO, climateZone: RegionDTO['climateZone'], avgHDD: number, avgCDD: number, totalRegionalM2: number, totalHeadcount: number, annualRevenueTarget: number | undefined, gridEmissionFactor: number, carbonTaxRate: number, carbonMarketType: RegionDTO['carbonMarketType'], marginalAbatementCost: number, renewableEnergyAvailability: number, gridRenewableShare: number, waterStressIndex: number, localRegulations: readonly string[], maturityLevel: RegionDTO['maturityLevel'], economicArea: RegionDTO['economicArea'], regionalManager: RegionDTO['regionalManager'], regionalReductionTarget: number, energyScarcityRisk: number, status: LifecycleStatus, description?: string | undefined, createdAt?: string | undefined, updatedAt?: string | undefined);
    static fromDTO(dto: RegionDTO): RegionEntity;
    assertIdentity(): void;
    toValue(): RegionDTO;
}
//# sourceMappingURL=region.entity.d.ts.map