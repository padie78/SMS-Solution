import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { CostCenterDTO } from './cost-center.dto.js';

/** Entidad transversal de prorrateo — referencia financiera a Branch y/o Building. */
export class CostCenterEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly branchId?: string,
    public readonly buildingId?: string,
    public readonly allocationMethod?: string,
    public readonly percentage?: number,
    public readonly annualBudget?: number
  ) {
    this.assertFinancialAttachment();
  }

  static fromDTO(dto: CostCenterDTO): CostCenterEntity {
    return new CostCenterEntity(
      dto.id,
      dto.name,
      dto.branchId,
      dto.buildingId,
      dto.allocationMethod,
      dto.percentage,
      dto.annualBudget
    );
  }

  assertFinancialAttachment(): void {
    if (!this.id?.trim()) throw new SmsDomainError('CostCenter.id required');
    if (!this.name?.trim()) throw new SmsDomainError('CostCenter.name required');
    const hasBranch = Boolean(this.branchId?.trim());
    const hasBuilding = Boolean(this.buildingId?.trim());
    if (!hasBranch && !hasBuilding) {
      throw new SmsDomainError(
        'CostCenter must reference at least one of branchId or buildingId for traceability'
      );
    }
  }

  assertCompatibleWithBuilding(buildingId: string, branchId: string): void {
    if (this.buildingId && this.buildingId !== buildingId) {
      throw new SmsDomainError(
        `CostCenter ${this.id} buildingId incompatible with Asset/Building context`
      );
    }
    if (this.branchId && this.branchId !== branchId) {
      throw new SmsDomainError(`CostCenter ${this.id} branchId incompatible with Building.branchId`);
    }
  }

  toValue(): CostCenterDTO {
    return {
      id: this.id,
      name: this.name,
      branchId: this.branchId,
      buildingId: this.buildingId,
      allocationMethod: this.allocationMethod,
      percentage: this.percentage,
      annualBudget: this.annualBudget
    };
  }
}
