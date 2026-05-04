/**
 * Cálculo Scope 2 simplificado (grid factor configurable).
 * Factor inyectado para tests y configuración por tenant/región.
 */
export class CarbonCalculator {
  /**
   * @param {number} [emissionFactorKgCo2ePerKwh=0.45] Intensidad kg CO2e / kWh
   */
  constructor(emissionFactorKgCo2ePerKwh = 0.45) {
    if (!Number.isFinite(emissionFactorKgCo2ePerKwh) || emissionFactorKgCo2ePerKwh < 0) {
      throw new Error('emissionFactorKgCo2ePerKwh must be a non-negative finite number');
    }
    this.emissionFactorKgCo2ePerKwh = emissionFactorKgCo2ePerKwh;
  }

  /**
   * Emisiones estimadas en kg CO2e.
   * @param {number} kwh
   * @returns {number}
   */
  calculate(kwh) {
    const k = Number(kwh);
    if (!Number.isFinite(k) || k < 0) {
      throw new Error('kwh must be a non-negative finite number');
    }
    return k * this.emissionFactorKgCo2ePerKwh;
  }

  /** Factor actual (útil para telemetría / auditoría). */
  getFactor() {
    return this.emissionFactorKgCo2ePerKwh;
  }
}
