import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { FacilityTypeSchema } from '../shared/graphql-setup-enums.js';

export const BranchDTOSchema = z.object({
  id: SmsIdSchema,
  regionId: SmsIdSchema,
  name: z.string().min(1),
  timezone: z.string().min(1).optional(),
  /** Superficie planta (mutación `createBranch` / setup). */
  m2Surface: z.number().nonnegative().optional(),
  facilityType: FacilityTypeSchema.optional(),
  /** Etiqueta geográfica libre del script (distinta de `regionId` en el árbol SMS). */
  regionLabel: z.string().min(1).optional()
});

export type BranchDTO = z.infer<typeof BranchDTOSchema>;

export const parseBranchDTO = (input: unknown): BranchDTO => BranchDTOSchema.parse(input);

export const safeParseBranchDTO = (input: unknown) => BranchDTOSchema.safeParse(input);
