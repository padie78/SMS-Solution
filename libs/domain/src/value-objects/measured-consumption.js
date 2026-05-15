import { DomainInvariantError } from '../exceptions/domain-invariant.error.js';
/**
 * Consumo energético medido con unidad física (inmutable).
 * Encapsula validaciones de magnitud no negativa y unidad presente.
 */
export class MeasuredConsumption {
    value;
    unit;
    constructor(value, unit) {
        this.value = value;
        this.unit = unit;
        Object.freeze(this);
    }
    static create(value, unit) {
        if (!Number.isFinite(value) || value < 0) {
            throw new DomainInvariantError('MeasuredConsumption.value must be a non-negative finite number');
        }
        const u = unit?.trim();
        if (!u) {
            throw new DomainInvariantError('MeasuredConsumption.unit is required');
        }
        return new MeasuredConsumption(value, u);
    }
}
//# sourceMappingURL=measured-consumption.js.map