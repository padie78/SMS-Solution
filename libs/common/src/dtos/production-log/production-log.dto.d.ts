import { z } from 'zod';
export declare const ProductionLogDTOSchema: z.ZodObject<{
    units: z.ZodNumber;
    unitType: z.ZodEnum<["TONS"]>;
    shiftMode: z.ZodEnum<["24/7"]>;
    efficiency: z.ZodNumber;
    activeLines: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    units: number;
    unitType: "TONS";
    shiftMode: "24/7";
    efficiency: number;
    activeLines: number;
}, {
    units: number;
    unitType: "TONS";
    shiftMode: "24/7";
    efficiency: number;
    activeLines: number;
}>;
export type ProductionLogDTO = z.infer<typeof ProductionLogDTOSchema>;
export declare const parseProductionLogDTO: (input: unknown) => ProductionLogDTO;
export declare const safeParseProductionLogDTO: (input: unknown) => z.SafeParseReturnType<{
    units: number;
    unitType: "TONS";
    shiftMode: "24/7";
    efficiency: number;
    activeLines: number;
}, {
    units: number;
    unitType: "TONS";
    shiftMode: "24/7";
    efficiency: number;
    activeLines: number;
}>;
//# sourceMappingURL=production-log.dto.d.ts.map