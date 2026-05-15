import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
export class ProductionLogEntity {
    orgId;
    branchId;
    period;
    units;
    unitType;
    shiftMode;
    efficiency;
    activeLines;
    constructor(orgId, branchId, period, units, unitType, shiftMode, efficiency, activeLines) {
        this.orgId = orgId;
        this.branchId = branchId;
        this.period = period;
        this.units = units;
        this.unitType = unitType;
        this.shiftMode = shiftMode;
        this.efficiency = efficiency;
        this.activeLines = activeLines;
        this.assertIdentity();
    }
    static fromMutation(orgId, branchId, period, dto) {
        return new ProductionLogEntity(orgId, branchId, period, dto.units, dto.unitType, dto.shiftMode, dto.efficiency, dto.activeLines);
    }
    assertIdentity() {
        if (!this.orgId?.trim())
            throw new DomainInvariantError('ProductionLog.orgId required');
        if (!this.branchId?.trim())
            throw new DomainInvariantError('ProductionLog.branchId required');
        if (!this.period?.trim())
            throw new DomainInvariantError('ProductionLog.period required');
    }
    toValue() {
        return {
            units: this.units,
            unitType: this.unitType,
            shiftMode: this.shiftMode,
            efficiency: this.efficiency,
            activeLines: this.activeLines
        };
    }
}
//# sourceMappingURL=production-log.entity.js.map