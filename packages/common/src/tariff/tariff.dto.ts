import { z } from 'zod';
import { TariffPricingModelSchema } from '../shared/graphql-setup-enums.js';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const TariffDTOSchema = z.object({
  providerName: z.string().min(1),
  contractId: z.string().min(1),
  pricingModel: TariffPricingModelSchema,
  baseRate: z.number().nonnegative(),
  validFrom: isoDateSchema,
  validTo: isoDateSchema
});

export type TariffDTO = z.infer<typeof TariffDTOSchema>;

export const parseTariffDTO = (input: unknown): TariffDTO => TariffDTOSchema.parse(input);

export const safeParseTariffDTO = (input: unknown) => TariffDTOSchema.safeParse(input);
