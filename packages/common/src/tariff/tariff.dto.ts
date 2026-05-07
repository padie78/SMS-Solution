import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { EnergyServiceTypeSchema, TariffLifecycleStatusSchema, TariffPricingModelSchema } from '../shared/graphql-setup-enums.js';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const TariffDTOSchema = z.object({
  /** Preferible enviar desde el cliente; si falta, el servicio debe generar uno estable. */
  id: SmsIdSchema.optional(),
  orgId: SmsIdSchema,
  branchId: SmsIdSchema,
  buildingId: SmsIdSchema.optional(),
  serviceType: EnergyServiceTypeSchema,
  providerName: z.string().min(1),
  contractId: z.string().min(1),
  pricingModel: TariffPricingModelSchema,
  baseRate: z.number().nonnegative(),
  currency: z.string().min(1).default('ILS'),
  validFrom: isoDateSchema,
  validTo: isoDateSchema,
  status: TariffLifecycleStatusSchema.default('ACTIVE')
});

export type TariffDTO = z.infer<typeof TariffDTOSchema>;

export const parseTariffDTO = (input: unknown): TariffDTO => TariffDTOSchema.parse(input);

export const safeParseTariffDTO = (input: unknown) => TariffDTOSchema.safeParse(input);
