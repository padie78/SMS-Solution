import type { EnergyServiceType, TariffDemandChargeUnit, TariffLifecycleStatus, TariffPricingModel, TariffSeason, TariffTierRatePair } from '@sms/common';
import { TariffDTO } from '@sms/common';
/** Contrato tarifario con benchmarking, demanda y capa ESG. */
export declare class TariffEntity {
    readonly id: string;
    readonly orgId: string;
    readonly branchId: string;
    readonly buildingId?: string;
    readonly providerName: string;
    readonly contractId: string;
    readonly serviceType: EnergyServiceType;
    readonly pricingModel: TariffPricingModel;
    readonly currency: string;
    readonly baseRate: number;
    readonly expectedAverageRate?: number;
    readonly demandChargeRate?: number;
    readonly demandChargeUnit: TariffDemandChargeUnit;
    readonly fixedMonthlyFee?: number;
    readonly taxPercentage: number;
    readonly touScheduleId?: string;
    readonly peakRate?: number;
    readonly valleyRate?: number;
    readonly shoulderRate?: number;
    readonly season: TariffSeason;
    readonly tieredRates?: TariffTierRatePair[];
    readonly fuelAdjustmentFactor: number;
    readonly indexReferenceId?: string;
    readonly indexAdjustmentFormula?: string;
    readonly volatilityIndex: number;
    readonly reactiveEnergyCharge?: number;
    readonly powerFactorThreshold: number;
    readonly greenPremium: number;
    readonly carbonTaxRate?: number;
    readonly efficiencyRebateRate?: number;
    readonly validFrom: string;
    readonly validTo: string;
    readonly billingCycleDay: number;
    readonly status: TariffLifecycleStatus;
    readonly tags: Record<string, string>;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    constructor(id: string, orgId: string, branchId: string, buildingId: string | undefined, providerName: string, contractId: string, serviceType: EnergyServiceType, pricingModel: TariffPricingModel, currency: string, baseRate: number, expectedAverageRate: number | undefined, demandChargeRate: number | undefined, demandChargeUnit: TariffDemandChargeUnit, fixedMonthlyFee: number | undefined, taxPercentage: number, touScheduleId: string | undefined, peakRate: number | undefined, valleyRate: number | undefined, shoulderRate: number | undefined, season: TariffSeason, tieredRates: TariffTierRatePair[] | undefined, fuelAdjustmentFactor: number, indexReferenceId: string | undefined, indexAdjustmentFormula: string | undefined, volatilityIndex: number, reactiveEnergyCharge: number | undefined, powerFactorThreshold: number, greenPremium: number, carbonTaxRate: number | undefined, efficiencyRebateRate: number | undefined, validFrom: string, validTo: string, billingCycleDay: number, status: TariffLifecycleStatus, tags: Record<string, string>, createdAt?: string, updatedAt?: string);
    static fromDTO(dto: TariffDTO): TariffEntity;
    assertIdentity(): void;
    toValue(): TariffDTO;
}
//# sourceMappingURL=tariff.entity.d.ts.map