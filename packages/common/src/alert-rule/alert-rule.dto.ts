import { z } from 'zod';
import {
  AlertOperatorSchema,
  AlertPrioritySchema,
  AlertStatusSchema
} from '../shared/graphql-setup-enums.js';

export const AlertRuleDTOSchema = z.object({
  name: z.string().min(1),
  status: AlertStatusSchema,
  priority: AlertPrioritySchema,
  threshold: z.number(),
  operator: AlertOperatorSchema
});

export type AlertRuleDTO = z.infer<typeof AlertRuleDTOSchema>;

export const parseAlertRuleDTO = (input: unknown): AlertRuleDTO => AlertRuleDTOSchema.parse(input);

export const safeParseAlertRuleDTO = (input: unknown) => AlertRuleDTOSchema.safeParse(input);
