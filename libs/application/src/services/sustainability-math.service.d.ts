/**
 * Converts billed kWh into MWh for emissions intensity denominators.
 */
export declare function kwhToMwh(kwh: number): number;
/**
 * Computes grid-location CO2e using a static intensity factor (kgCO2e per kWh).
 * Extend with Climatiq-specific curves without coupling this package to HTTP clients.
 */
export declare function estimateGridCo2eKg(params: {
    kwh: number;
    gridIntensityKgCo2ePerKwh: number;
}): number;
/**
 * Projects monetary carbon intensity once invoice totals exist.
 */
export declare function carbonIntensityPerCurrency(co2eKg: number, invoiceTotal: number): number;
//# sourceMappingURL=sustainability-math.service.d.ts.map