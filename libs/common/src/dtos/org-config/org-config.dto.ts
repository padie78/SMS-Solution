import { z } from 'zod';
import {
  CurrencyCodeSchema,
  IndustrySectorSchema,
  ReportingCurrencyCodeSchema,
  SubscriptionPlanSchema
} from '../shared/graphql-setup-enums.js';

export const OrgConfigDTOSchema = z.object({
  name: z.string().min(1),
  taxId: z.string().min(1),
  hqAddress: z.string().min(1),
  totalGlobalM2: z.number().nonnegative(),
  industrySector: IndustrySectorSchema,
  currency: CurrencyCodeSchema,
  reportingCurrency: ReportingCurrencyCodeSchema,
  minConfidence: z.number().min(0).max(1),
  baselineYear: z.number().int().positive(),
  reductionTarget: z.number(),
  targetYear: z.number().int().positive(),
  subscriptionPlan: SubscriptionPlanSchema
});

export type OrgConfigDTO = z.infer<typeof OrgConfigDTOSchema>;

export const parseOrgConfigDTO = (input: unknown): OrgConfigDTO => OrgConfigDTOSchema.parse(input);

export const safeParseOrgConfigDTO = (input: unknown) => OrgConfigDTOSchema.safeParse(input);
