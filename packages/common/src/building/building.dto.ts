import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { GeoCoordinatesDTOSchema } from '../shared/geo.dto.js';
import {
  BuildingUsageTypeSchema,
  HvacTypeSchema,
  MainFuelTypeSchema,
  OperationalStatusSchema
} from '../shared/graphql-setup-enums.js';

export const BuildingDTOSchema = z.object({
  id: SmsIdSchema,
  organizationId: SmsIdSchema,
  regionId: SmsIdSchema,
  branchId: SmsIdSchema,
  name: z.string().min(1),
  /** Compat: texto libre legado; dominio canónico `usageTypeEnum`. */
  usageType: z.string().min(1).optional(),
  usageTypeEnum: BuildingUsageTypeSchema,
  m2Surface: z.number().nonnegative(),
  m3Volume: z.number().nonnegative().optional(),
  yearBuilt: z.number().int().positive().optional(),
  hvacType: HvacTypeSchema,
  hasBms: z.boolean(),
  bmsVendor: z.string().min(1).optional(),
  mainFuelType: MainFuelTypeSchema.optional(),
  status: OperationalStatusSchema,
  coordinates: GeoCoordinatesDTOSchema.optional(),
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional()
});

export type BuildingDTO = z.infer<typeof BuildingDTOSchema>;

export const parseBuildingDTO = (input: unknown): BuildingDTO => BuildingDTOSchema.parse(input);

export const safeParseBuildingDTO = (input: unknown) => BuildingDTOSchema.safeParse(input);
