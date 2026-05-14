import { z } from 'zod';
/** Dirección física (sucursales / sedes). */
export const AddressDTOSchema = z.object({
    streetLine1: z.string().min(1),
    streetLine2: z.string().optional(),
    city: z.string().min(1),
    stateOrRegion: z.string().optional(),
    postalCode: z.string().optional(),
    countryCode: z.string().min(2).max(3)
});
//# sourceMappingURL=address.dto.js.map