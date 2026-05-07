import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { CostAllocationMethod, LifecycleStatus } from '../shared/graphql-setup-enums.js';
import type { CostCenterDTO } from './cost-center.dto.js';

/** Entidad transversal de prorrateo — referencia financiera a Branch y/o Building. */
export class CostCenterEntity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly name: string,
    public readonly annualBudget: number,
    public readonly allocationMethod: CostAllocationMethod,
    public readonly status: LifecycleStatus,
    public readonly currency: string = 'ILS',
    public readonly fiscalYear: number = new Date().getFullYear(),
    public readonly percentage: number = 100,
    public readonly branchId?: string,
    public readonly buildingId?: string,
    public readonly externalId?: string,
    public readonly updatedAt?: string
  ) {
    this.assertIdentity();
  }

  static fromDTO(dto: CostCenterDTO): CostCenterEntity {
    return new CostCenterEntity(
      dto.id,
      dto.organizationId,
      dto.name,
      dto.annualBudget,
      dto.allocationMethod,
      dto.status,
      dto.currency,
      dto.fiscalYear,
      dto.percentage,
      dto.branchId,
      dto.buildingId,
      dto.externalId,
      dto.updatedAt
    );
  }

  assertIdentity(): void {
    if (!this.id?.trim()) throw new SmsDomainError('CostCenter.id required');
    if (!this.organizationId?.trim()) throw new SmsDomainError('CostCenter.organizationId required');
    if (!this.name?.trim()) throw new SmsDomainError('CostCenter.name required');
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
      organizationId: this.organizationId,
      name: this.name,
      annualBudget: this.annualBudget,
      allocationMethod: this.allocationMethod,
      status: this.status,
      currency: this.currency,
      fiscalYear: this.fiscalYear,
      percentage: this.percentage,
      ...(this.branchId !== undefined ? { branchId: this.branchId } : {}),
      ...(this.buildingId !== undefined ? { buildingId: this.buildingId } : {}),
      ...(this.externalId !== undefined ? { externalId: this.externalId } : {}),
      ...(this.updatedAt !== undefined ? { updatedAt: this.updatedAt } : {})
    };
  }
}
