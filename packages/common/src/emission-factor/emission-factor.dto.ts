import { z } from 'zod';
import {
  EmissionActivityTypeSchema,
  EmissionFactorUnitSchema,
  EmissionScopeSchema
} from '../shared/graphql-setup-enums.js';

export const EmissionFactorDTOSchema = z.object({
  name: z.string().min(1),
  year: z.number().int().positive(),
  regionCode: z.string().min(1),
  activityType: EmissionActivityTypeSchema,
  unit: EmissionFactorUnitSchema,
  value: z.number().nonnegative(),
  scope: EmissionScopeSchema
});

export type EmissionFactorDTO = z.infer<typeof EmissionFactorDTOSchema>;

export const parseEmissionFactorDTO = (input: unknown): EmissionFactorDTO =>
  EmissionFactorDTOSchema.parse(input);

export const safeParseEmissionFactorDTO = (input: unknown) =>
  EmissionFactorDTOSchema.safeParse(input);
