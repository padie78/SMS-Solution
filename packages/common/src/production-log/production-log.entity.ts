import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { ProductionLogDTO } from './production-log.dto.js';

export class ProductionLogEntity {
  constructor(
    public readonly orgId: string,
    public readonly branchId: string,
    public readonly period: string,
    public readonly units: number,
    public readonly unitType: ProductionLogDTO['unitType'],
    public readonly shiftMode: ProductionLogDTO['shiftMode'],
    public readonly efficiency: number,
    public readonly activeLines: number
  ) {
    this.assertIdentity();
  }

  static fromMutation(
    orgId: string,
    branchId: string,
    period: string,
    dto: ProductionLogDTO
  ): ProductionLogEntity {
    return new ProductionLogEntity(
      orgId,
      branchId,
      period,
      dto.units,
      dto.unitType,
      dto.shiftMode,
      dto.efficiency,
      dto.activeLines
    );
  }

  assertIdentity(): void {
    if (!this.orgId?.trim()) throw new SmsDomainError('ProductionLog.orgId required');
    if (!this.branchId?.trim()) throw new SmsDomainError('ProductionLog.branchId required');
    if (!this.period?.trim()) throw new SmsDomainError('ProductionLog.period required');
  }

  toValue(): ProductionLogDTO {
    return {
      units: this.units,
      unitType: this.unitType,
      shiftMode: this.shiftMode,
      efficiency: this.efficiency,
      activeLines: this.activeLines
    };
  }
}
