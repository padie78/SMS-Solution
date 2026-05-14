import { z } from 'zod';
import { SmsIdSchema } from '../../schemas/sms-id.schema.js';
import { LifecycleStatusSchema } from '../shared/graphql-setup-enums.js';
import { OrgConfigDTOSchema } from './org-config.dto.js';

const iso6391Schema = z.string().regex(/^[a-z]{2}$/, 'Expected ISO 639-1 code (e.g. en, es)');
const unitSystemSchema = z.enum(['METRIC', 'IMPERIAL']);

export const AdminContactDTOSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(3),
  phone: z.string().min(3).optional()
});

export const OrganizationDTOSchema = OrgConfigDTOSchema.extend({
  orgId: SmsIdSchema,
  /** Branding e identidad legal. */
  legalName: z.string().min(1),
  websiteUrl: z.string().min(1).optional(),
  logoUrl: z.string().min(1).optional(),

  /** Localización y estándares. */
  primaryLanguage: z.preprocess(
    (v) => (v === null ? undefined : v),
    iso6391Schema.default('en')
  ),
  unitSystem: z.preprocess((v) => (v === null ? undefined : v), unitSystemSchema.default('METRIC')),
  /**
   * Legacy/back-compat. Aún se persiste/consume en UI.
   * El estándar Enterprise lo considera parte de "Localización".
   */
  defaultTimeZone: z.preprocess((v) => (v === null ? undefined : v), z.string().min(1).default('UTC')),

  /** Configuración operativa. Mes (1-12) inicio fiscal. */
  fiscalYearStart: z.preprocess(
    (v) => (v === null ? undefined : v),
    z.number().int().min(1).max(12).default(1)
  ),

  /** Contacto administrativo (operaciones / billing / compliance). */
  adminContact: AdminContactDTOSchema,

  /** Gobernanza ESG: marcos aplicables (GRI, SASB, etc.). */
  esgFrameworks: z.array(z.string().min(1)).default([]),
  status: LifecycleStatusSchema.default('ACTIVE'),
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional()
});

export class OrganizationDTO {
  public readonly orgId: string;
  public readonly name: string;
  public readonly legalName: string;
  public readonly taxId: string;
  public readonly industrySector: z.infer<typeof OrgConfigDTOSchema>['industrySector'];
  public readonly hqAddress: string;
  public readonly websiteUrl?: string;
  public readonly logoUrl?: string;
  public readonly primaryLanguage: string;
  public readonly unitSystem: 'METRIC' | 'IMPERIAL';
  public readonly currency: z.infer<typeof OrgConfigDTOSchema>['currency'];
  public readonly reportingCurrency: z.infer<typeof OrgConfigDTOSchema>['reportingCurrency'];
  public readonly fiscalYearStart: number;
  public readonly totalGlobalM2: number;
  public readonly baselineYear: number;
  public readonly targetYear: number;
  public readonly reductionTarget: number;
  public readonly minConfidence: number;
  public readonly esgFrameworks: string[];
  public readonly subscriptionPlan: z.infer<typeof OrgConfigDTOSchema>['subscriptionPlan'];
  public readonly status: z.infer<typeof LifecycleStatusSchema>;
  public readonly adminContact: { name: string; email: string; phone?: string };
  public readonly createdAt?: string;
  public readonly updatedAt?: string;

  constructor(
    orgId: string,
    name: string,
    legalName: string,
    taxId: string,
    industrySector: z.infer<typeof OrgConfigDTOSchema>['industrySector'],
    hqAddress: string,
    websiteUrl: string | undefined,
    logoUrl: string | undefined,
    primaryLanguage: string | null | undefined,
    unitSystem: 'METRIC' | 'IMPERIAL' | null | undefined,
    currency: z.infer<typeof OrgConfigDTOSchema>['currency'],
    reportingCurrency: z.infer<typeof OrgConfigDTOSchema>['reportingCurrency'],
    fiscalYearStart: number | null | undefined,
    totalGlobalM2: number,
    baselineYear: number,
    targetYear: number,
    reductionTarget: number,
    minConfidence: number,
    esgFrameworks: string[] | null | undefined,
    subscriptionPlan: z.infer<typeof OrgConfigDTOSchema>['subscriptionPlan'],
    status: z.infer<typeof LifecycleStatusSchema> | null | undefined,
    adminContact: { name: string; email: string; phone?: string },
    createdAt?: string,
    updatedAt?: string
  ) {
    this.orgId = orgId;
    this.name = name;
    this.legalName = legalName;
    this.taxId = taxId;
    this.industrySector = industrySector;
    this.hqAddress = hqAddress;
    if (websiteUrl) this.websiteUrl = websiteUrl;
    if (logoUrl) this.logoUrl = logoUrl;
    this.primaryLanguage = primaryLanguage ?? 'en';
    this.unitSystem = unitSystem ?? 'METRIC';
    this.currency = currency;
    this.reportingCurrency = reportingCurrency;
    this.fiscalYearStart = fiscalYearStart ?? 1;
    this.totalGlobalM2 = totalGlobalM2;
    this.baselineYear = baselineYear;
    this.targetYear = targetYear;
    this.reductionTarget = reductionTarget;
    this.minConfidence = minConfidence;
    this.esgFrameworks = Array.isArray(esgFrameworks) ? esgFrameworks : [];
    this.subscriptionPlan = subscriptionPlan;
    this.status = status ?? 'ACTIVE';
    this.adminContact = adminContact;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Legacy/back-compat: aún usado por UI y persistencia.
   * El estándar Enterprise lo agrupa bajo "Localización".
   */
  public readonly defaultTimeZone: string = 'UTC';
}

export type OrganizationDTOInput = z.infer<typeof OrganizationDTOSchema>;

export const parseOrganizationDTO = (input: unknown): OrganizationDTO => {
  const dto = OrganizationDTOSchema.parse(input);
  const out = new OrganizationDTO(
    dto.orgId,
    dto.name,
    dto.legalName,
    dto.taxId,
    dto.industrySector,
    dto.hqAddress,
    dto.websiteUrl,
    dto.logoUrl,
    dto.primaryLanguage ?? 'en',
    (dto.unitSystem ?? 'METRIC') as 'METRIC' | 'IMPERIAL',
    dto.currency,
    dto.reportingCurrency,
    dto.fiscalYearStart ?? 1,
    dto.totalGlobalM2,
    dto.baselineYear,
    dto.targetYear,
    dto.reductionTarget,
    dto.minConfidence,
    [...(dto.esgFrameworks ?? [])],
    dto.subscriptionPlan,
    dto.status ?? 'ACTIVE',
    dto.adminContact,
    dto.createdAt,
    dto.updatedAt
  );
  // back-compat: defaultTimeZone proviene del input validado
  (out as { defaultTimeZone: string }).defaultTimeZone = dto.defaultTimeZone ?? 'UTC';
  return out;
};

export const safeParseOrganizationDTO = (input: unknown) => OrganizationDTOSchema.safeParse(input);
