import { z } from 'zod';
/** Dirección física (sucursales / sedes). */
export declare const AddressDTOSchema: z.ZodObject<{
    streetLine1: z.ZodString;
    streetLine2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    stateOrRegion: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
    countryCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    streetLine1: string;
    city: string;
    countryCode: string;
    streetLine2?: string | undefined;
    stateOrRegion?: string | undefined;
    postalCode?: string | undefined;
}, {
    streetLine1: string;
    city: string;
    countryCode: string;
    streetLine2?: string | undefined;
    stateOrRegion?: string | undefined;
    postalCode?: string | undefined;
}>;
export type AddressDTO = z.infer<typeof AddressDTOSchema>;
//# sourceMappingURL=address.dto.d.ts.map