/**
 * Consumo energético medido con unidad física (inmutable).
 * Encapsula validaciones de magnitud no negativa y unidad presente.
 */
export declare class MeasuredConsumption {
    readonly value: number;
    readonly unit: string;
    private constructor();
    static create(value: number, unit: string): MeasuredConsumption;
}
//# sourceMappingURL=measured-consumption.d.ts.map