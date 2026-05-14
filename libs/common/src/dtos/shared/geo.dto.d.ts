import { z } from 'zod';
export declare const GeoCoordinatesDTOSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
}, {
    lat: number;
    lng: number;
}>;
export type GeoCoordinatesDTO = z.infer<typeof GeoCoordinatesDTOSchema>;
//# sourceMappingURL=geo.dto.d.ts.map