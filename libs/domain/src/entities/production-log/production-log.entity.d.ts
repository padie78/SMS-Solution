import type { ProductionLogDTO } from '@sms/common';
export declare class ProductionLogEntity {
    readonly orgId: string;
    readonly branchId: string;
    readonly period: string;
    readonly units: number;
    readonly unitType: ProductionLogDTO['unitType'];
    readonly shiftMode: ProductionLogDTO['shiftMode'];
    readonly efficiency: number;
    readonly activeLines: number;
    constructor(orgId: string, branchId: string, period: string, units: number, unitType: ProductionLogDTO['unitType'], shiftMode: ProductionLogDTO['shiftMode'], efficiency: number, activeLines: number);
    static fromMutation(orgId: string, branchId: string, period: string, dto: ProductionLogDTO): ProductionLogEntity;
    assertIdentity(): void;
    toValue(): ProductionLogDTO;
}
//# sourceMappingURL=production-log.entity.d.ts.map