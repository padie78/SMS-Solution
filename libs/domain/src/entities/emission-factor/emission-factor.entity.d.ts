import { EmissionFactorDTO } from '@sms/common';
export declare class EmissionFactorEntity {
    readonly id: string;
    readonly name: string;
    readonly year: number;
    readonly regionCode: string;
    readonly activityType: EmissionFactorDTO['activityType'];
    readonly scope: EmissionFactorDTO['scope'];
    readonly calculationMethod?: EmissionFactorDTO['calculationMethod'];
    readonly unit: EmissionFactorDTO['unit'];
    readonly value: number;
    readonly co2Value?: number;
    readonly ch4Value?: number;
    readonly n2oValue?: number;
    readonly hfcValue?: number;
    readonly gwpReference: EmissionFactorDTO['gwpReference'];
    readonly source: string;
    readonly sourceUrl?: string;
    readonly dataQualityTier: EmissionFactorDTO['dataQualityTier'];
    readonly uncertaintyPercentage: number;
    readonly externalAuditDate?: string;
    readonly isProjection: boolean;
    readonly decarbonizationTrend: number;
    readonly biologicalCarbonStorage?: number;
    readonly status: EmissionFactorDTO['status'];
    readonly tags: Record<string, string>;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    constructor(id: string, name: string, year: number, regionCode: string, activityType: EmissionFactorDTO['activityType'], scope: EmissionFactorDTO['scope'], calculationMethod: EmissionFactorDTO['calculationMethod'] | undefined, unit: EmissionFactorDTO['unit'], value: number, co2Value: number | undefined, ch4Value: number | undefined, n2oValue: number | undefined, hfcValue: number | undefined, gwpReference: EmissionFactorDTO['gwpReference'], source: string, sourceUrl: string | undefined, dataQualityTier: EmissionFactorDTO['dataQualityTier'], uncertaintyPercentage: number, externalAuditDate: string | undefined, isProjection: boolean, decarbonizationTrend: number, biologicalCarbonStorage: number | undefined, status: EmissionFactorDTO['status'], tags: Record<string, string>, createdAt?: string, updatedAt?: string);
    static fromDTO(dto: EmissionFactorDTO): EmissionFactorEntity;
    assertIdentity(): void;
    private validateConsistency;
    toValue(): EmissionFactorDTO;
}
//# sourceMappingURL=emission-factor.entity.d.ts.map