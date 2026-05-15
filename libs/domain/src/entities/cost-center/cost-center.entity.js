import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import { CostCenterDTO } from '@sms/common';
/** Entidad transversal de prorrateo — referencia financiera a Branch y/o Building. */
export class CostCenterEntity {
    id;
    organizationId;
    name;
    externalId;
    parentId;
    branchId;
    buildingId;
    annualBudget;
    currency;
    budgetThresholdAlert;
    carbonBudgetTons;
    carbonShadowPrice;
    budgetSensitivityIndex;
    fiscalYear;
    headcount;
    floorAreaSqm;
    productionUnitName;
    targetIntensity;
    renewableEnergyTarget;
    allocationMethod;
    percentage;
    iscommon;
    allocationLastReviewDate;
    approvedBy;
    type;
    forecastModel;
    managerEmail;
    operatingHoursId;
    status;
    tags;
    createdAt;
    updatedAt;
    constructor(id, organizationId, name, externalId, parentId, branchId, buildingId, annualBudget, currency, budgetThresholdAlert, carbonBudgetTons, carbonShadowPrice, budgetSensitivityIndex, fiscalYear, headcount, floorAreaSqm, productionUnitName, targetIntensity, renewableEnergyTarget, allocationMethod, percentage, iscommon, allocationLastReviewDate, approvedBy, type, forecastModel, managerEmail, operatingHoursId, status, tags, createdAt, updatedAt) {
        this.id = id;
        this.organizationId = organizationId;
        this.name = name;
        if (externalId !== undefined)
            this.externalId = externalId;
        if (parentId !== undefined)
            this.parentId = parentId;
        if (branchId !== undefined)
            this.branchId = branchId;
        if (buildingId !== undefined)
            this.buildingId = buildingId;
        this.annualBudget = annualBudget;
        this.currency = currency;
        this.budgetThresholdAlert = budgetThresholdAlert;
        if (carbonBudgetTons !== undefined)
            this.carbonBudgetTons = carbonBudgetTons;
        if (carbonShadowPrice !== undefined)
            this.carbonShadowPrice = carbonShadowPrice;
        this.budgetSensitivityIndex = budgetSensitivityIndex;
        this.fiscalYear = fiscalYear;
        if (headcount !== undefined)
            this.headcount = headcount;
        if (floorAreaSqm !== undefined)
            this.floorAreaSqm = floorAreaSqm;
        if (productionUnitName !== undefined)
            this.productionUnitName = productionUnitName;
        if (targetIntensity !== undefined)
            this.targetIntensity = targetIntensity;
        this.renewableEnergyTarget = renewableEnergyTarget;
        this.allocationMethod = allocationMethod;
        this.percentage = percentage;
        this.iscommon = iscommon;
        if (allocationLastReviewDate !== undefined)
            this.allocationLastReviewDate = allocationLastReviewDate;
        if (approvedBy !== undefined)
            this.approvedBy = approvedBy;
        this.type = type;
        this.forecastModel = forecastModel;
        if (managerEmail !== undefined)
            this.managerEmail = managerEmail;
        if (operatingHoursId !== undefined)
            this.operatingHoursId = operatingHoursId;
        this.status = status;
        this.tags = { ...tags };
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.assertIdentity();
    }
    static fromDTO(dto) {
        return new CostCenterEntity(dto.id, dto.organizationId, dto.name, dto.externalId, dto.parentId, dto.branchId, dto.buildingId, dto.annualBudget, dto.currency, dto.budgetThresholdAlert, dto.carbonBudgetTons, dto.carbonShadowPrice, dto.budgetSensitivityIndex, dto.fiscalYear, dto.headcount, dto.floorAreaSqm, dto.productionUnitName, dto.targetIntensity, dto.renewableEnergyTarget, dto.allocationMethod, dto.percentage, dto.iscommon, dto.allocationLastReviewDate, dto.approvedBy, dto.type, dto.forecastModel, dto.managerEmail, dto.operatingHoursId, dto.status, dto.tags, dto.createdAt, dto.updatedAt);
    }
    assertIdentity() {
        if (!this.id?.trim())
            throw new DomainInvariantError('CostCenter.id required');
        if (!this.organizationId?.trim())
            throw new DomainInvariantError('CostCenter.organizationId required');
        if (!this.name?.trim())
            throw new DomainInvariantError('CostCenter.name required');
        if (this.annualBudget < 0 || !Number.isFinite(this.annualBudget)) {
            throw new DomainInvariantError('CostCenter.annualBudget invalid');
        }
        if (this.budgetThresholdAlert < 0 || this.budgetThresholdAlert > 1) {
            throw new DomainInvariantError('CostCenter.budgetThresholdAlert invalid');
        }
        if (this.budgetSensitivityIndex < 0 || this.budgetSensitivityIndex > 1) {
            throw new DomainInvariantError('CostCenter.budgetSensitivityIndex invalid');
        }
        if (this.percentage < 0 || this.percentage > 100) {
            throw new DomainInvariantError('CostCenter.percentage invalid');
        }
        if (this.renewableEnergyTarget < 0 || this.renewableEnergyTarget > 100) {
            throw new DomainInvariantError('CostCenter.renewableEnergyTarget invalid');
        }
    }
    assertCompatibleWithBuilding(buildingId, branchId) {
        if (this.buildingId && this.buildingId !== buildingId) {
            throw new DomainInvariantError(`CostCenter ${this.id} buildingId incompatible with Asset/Building context`);
        }
        if (this.branchId && this.branchId !== branchId) {
            throw new DomainInvariantError(`CostCenter ${this.id} branchId incompatible with Building.branchId`);
        }
    }
    toValue() {
        return new CostCenterDTO(this.id, this.organizationId, this.name, this.externalId, this.parentId, this.branchId, this.buildingId, this.annualBudget, this.currency, this.budgetThresholdAlert, this.carbonBudgetTons, this.carbonShadowPrice, this.budgetSensitivityIndex, this.fiscalYear, this.headcount, this.floorAreaSqm, this.productionUnitName, this.targetIntensity, this.renewableEnergyTarget, this.allocationMethod, this.percentage, this.iscommon, this.allocationLastReviewDate, this.approvedBy, this.type, this.forecastModel, this.managerEmail, this.operatingHoursId, this.status, this.tags, this.createdAt, this.updatedAt);
    }
}
//# sourceMappingURL=cost-center.entity.js.map