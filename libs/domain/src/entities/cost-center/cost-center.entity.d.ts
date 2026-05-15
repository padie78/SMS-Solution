import type { CostAllocationMethod, LifecycleStatus } from '@sms/common';
import { CostCenterDTO } from '@sms/common';
/** Entidad transversal de prorrateo — referencia financiera a Branch y/o Building. */
export declare class CostCenterEntity {
    readonly id: string;
    readonly organizationId: string;
    readonly name: string;
    readonly externalId?: string;
    readonly parentId?: string;
    readonly branchId?: string;
    readonly buildingId?: string;
    readonly annualBudget: number;
    readonly currency: string;
    readonly budgetThresholdAlert: number;
    readonly carbonBudgetTons?: number;
    readonly carbonShadowPrice?: number;
    readonly budgetSensitivityIndex: number;
    readonly fiscalYear: number;
    readonly headcount?: number;
    readonly floorAreaSqm?: number;
    readonly productionUnitName?: string;
    readonly targetIntensity?: number;
    readonly renewableEnergyTarget: number;
    readonly allocationMethod: CostAllocationMethod;
    readonly percentage: number;
    readonly iscommon: boolean;
    readonly allocationLastReviewDate?: string;
    readonly approvedBy?: string;
    readonly type: 'DEPARTMENT' | 'PROJECT' | 'SERVICE' | 'OPERATIONAL_UNIT';
    readonly forecastModel: 'LINEAR' | 'ML_PROPHET' | 'ARIMA' | 'STRICT_BUDGET';
    readonly managerEmail?: string;
    readonly operatingHoursId?: string;
    readonly status: LifecycleStatus;
    readonly tags: Record<string, string>;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    constructor(id: string, organizationId: string, name: string, externalId: string | undefined, parentId: string | undefined, branchId: string | undefined, buildingId: string | undefined, annualBudget: number, currency: string, budgetThresholdAlert: number, carbonBudgetTons: number | undefined, carbonShadowPrice: number | undefined, budgetSensitivityIndex: number, fiscalYear: number, headcount: number | undefined, floorAreaSqm: number | undefined, productionUnitName: string | undefined, targetIntensity: number | undefined, renewableEnergyTarget: number, allocationMethod: CostAllocationMethod, percentage: number, iscommon: boolean, allocationLastReviewDate: string | undefined, approvedBy: string | undefined, type: 'DEPARTMENT' | 'PROJECT' | 'SERVICE' | 'OPERATIONAL_UNIT', forecastModel: 'LINEAR' | 'ML_PROPHET' | 'ARIMA' | 'STRICT_BUDGET', managerEmail: string | undefined, operatingHoursId: string | undefined, status: LifecycleStatus, tags: Record<string, string>, createdAt?: string, updatedAt?: string);
    static fromDTO(dto: CostCenterDTO): CostCenterEntity;
    assertIdentity(): void;
    assertCompatibleWithBuilding(buildingId: string, branchId: string): void;
    toValue(): CostCenterDTO;
}
//# sourceMappingURL=cost-center.entity.d.ts.map