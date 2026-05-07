import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { LifecycleStatusSchema } from '../shared/graphql-setup-enums.js';
import { OrgConfigDTOSchema } from './org-config.dto.js';

const iso6391Schema = z.string().regex(/^[a-z]{2}$/, 'Expected ISO 639-1 code (e.g. en, es)');
const unitSystemSchema = z.enum(['METRIC', 'IMPERIAL']);

export const AdminContactDTOSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(3),
  phone: z.string().min(3)
});

export const OrganizationDTOSchema = OrgConfigDTOSchema.extend({
  orgId: SmsIdSchema,
  /** Branding e identidad legal. */
  legalName: z.string().min(1),
  websiteUrl: z.string().min(1).optional(),
  logoUrl: z.string().min(1).optional(),

  /** Localización y estándares. */
  primaryLanguage: iso6391Schema.default('en'),
  unitSystem: unitSystemSchema.default('METRIC'),
  defaultTimeZone: z.string().min(1),

  /** Configuración operativa. Mes (1-12) inicio fiscal. */
  fiscalYearStart: z.number().int().min(1).max(12),

  /** Contacto administrativo (operaciones / billing / compliance). */
  adminContact: AdminContactDTOSchema,

  /** Gobernanza ESG: marcos aplicables (GRI, SASB, etc.). */
  esgFrameworks: z.array(z.string().min(1)).default([]),
  status: LifecycleStatusSchema.default('ACTIVE'),
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional()
});

export type OrganizationDTO = z.infer<typeof OrganizationDTOSchema>;

export const parseOrganizationDTO = (input: unknown): OrganizationDTO =>
  OrganizationDTOSchema.parse(input);

export const safeParseOrganizationDTO = (input: unknown) => OrganizationDTOSchema.safeParse(input);
