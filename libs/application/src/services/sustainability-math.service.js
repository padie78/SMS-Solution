/**
 * Converts billed kWh into MWh for emissions intensity denominators.
 */
export function kwhToMwh(kwh) {
    if (!Number.isFinite(kwh)) {
        throw new Error('kwhToMwh expects a finite number');
    }
    return kwh / 1000;
}
/**
 * Computes grid-location CO2e using a static intensity factor (kgCO2e per kWh).
 * Extend with Climatiq-specific curves without coupling this package to HTTP clients.
 */
export function estimateGridCo2eKg(params) {
    if (params.kwh < 0 || params.gridIntensityKgCo2ePerKwh < 0) {
        throw new Error('estimateGridCo2eKg expects non-negative inputs');
    }
    return params.kwh * params.gridIntensityKgCo2ePerKwh;
}
/**
 * Projects monetary carbon intensity once invoice totals exist.
 */
export function carbonIntensityPerCurrency(co2eKg, invoiceTotal) {
    if (invoiceTotal <= 0 || !Number.isFinite(invoiceTotal)) {
        return 0;
    }
    return co2eKg / invoiceTotal;
}
//# sourceMappingURL=sustainability-math.service.js.map