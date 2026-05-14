import { z } from 'zod';
import { LifecycleStatusSchema } from '../shared/graphql-setup-enums.js';
import { OrgConfigDTOSchema } from './org-config.dto.js';
export declare const AdminContactDTOSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    phone?: string | undefined;
}, {
    name: string;
    email: string;
    phone?: string | undefined;
}>;
export declare const OrganizationDTOSchema: z.ZodObject<{
    name: z.ZodString;
    taxId: z.ZodString;
    hqAddress: z.ZodString;
    totalGlobalM2: z.ZodNumber;
    industrySector: z.ZodEnum<["MANUFACTURING"]>;
    currency: z.ZodEnum<["ILS"]>;
    reportingCurrency: z.ZodEnum<["USD"]>;
    minConfidence: z.ZodNumber;
    baselineYear: z.ZodNumber;
    reductionTarget: z.ZodNumber;
    targetYear: z.ZodNumber;
    subscriptionPlan: z.ZodEnum<["ENTERPRISE"]>;
} & {
    orgId: z.ZodUnion<[z.ZodString, z.ZodString]>;
    /** Branding e identidad legal. */
    legalName: z.ZodString;
    websiteUrl: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodOptional<z.ZodString>;
    /** Localización y estándares. */
    primaryLanguage: z.ZodEffects<z.ZodDefault<z.ZodString>, string, unknown>;
    unitSystem: z.ZodEffects<z.ZodDefault<z.ZodEnum<["METRIC", "IMPERIAL"]>>, "METRIC" | "IMPERIAL", unknown>;
    /**
     * Legacy/back-compat. Aún se persiste/consume en UI.
     * El estándar Enterprise lo considera parte de "Localización".
     */
    defaultTimeZone: z.ZodEffects<z.ZodDefault<z.ZodString>, string, unknown>;
    /** Configuración operativa. Mes (1-12) inicio fiscal. */
    fiscalYearStart: z.ZodEffects<z.ZodDefault<z.ZodNumber>, number, unknown>;
    /** Contacto administrativo (operaciones / billing / compliance). */
    adminContact: z.ZodObject<{
        name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        email: string;
        phone?: string | undefined;
    }, {
        name: string;
        email: string;
        phone?: string | undefined;
    }>;
    /** Gobernanza ESG: marcos aplicables (GRI, SASB, etc.). */
    esgFrameworks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "INACTIVE"]>>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "INACTIVE" | "ACTIVE";
    name: string;
    currency: "ILS";
    orgId: string;
    taxId: string;
    hqAddress: string;
    totalGlobalM2: number;
    industrySector: "MANUFACTURING";
    reportingCurrency: "USD";
    minConfidence: number;
    baselineYear: number;
    reductionTarget: number;
    targetYear: number;
    subscriptionPlan: "ENTERPRISE";
    legalName: string;
    primaryLanguage: string;
    unitSystem: "METRIC" | "IMPERIAL";
    defaultTimeZone: string;
    fiscalYearStart: number;
    adminContact: {
        name: string;
        email: string;
        phone?: string | undefined;
    };
    esgFrameworks: string[];
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    websiteUrl?: string | undefined;
    logoUrl?: string | undefined;
}, {
    name: string;
    currency: "ILS";
    orgId: string;
    taxId: string;
    hqAddress: string;
    totalGlobalM2: number;
    industrySector: "MANUFACTURING";
    reportingCurrency: "USD";
    minConfidence: number;
    baselineYear: number;
    reductionTarget: number;
    targetYear: number;
    subscriptionPlan: "ENTERPRISE";
    legalName: string;
    adminContact: {
        name: string;
        email: string;
        phone?: string | undefined;
    };
    status?: "INACTIVE" | "ACTIVE" | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    websiteUrl?: string | undefined;
    logoUrl?: string | undefined;
    primaryLanguage?: unknown;
    unitSystem?: unknown;
    defaultTimeZone?: unknown;
    fiscalYearStart?: unknown;
    esgFrameworks?: string[] | undefined;
}>;
export declare class OrganizationDTO {
    readonly orgId: string;
    readonly name: string;
    readonly legalName: string;
    readonly taxId: string;
    readonly industrySector: z.infer<typeof OrgConfigDTOSchema>['industrySector'];
    readonly hqAddress: string;
    readonly websiteUrl?: string;
    readonly logoUrl?: string;
    readonly primaryLanguage: string;
    readonly unitSystem: 'METRIC' | 'IMPERIAL';
    readonly currency: z.infer<typeof OrgConfigDTOSchema>['currency'];
    readonly reportingCurrency: z.infer<typeof OrgConfigDTOSchema>['reportingCurrency'];
    readonly fiscalYearStart: number;
    readonly totalGlobalM2: number;
    readonly baselineYear: number;
    readonly targetYear: number;
    readonly reductionTarget: number;
    readonly minConfidence: number;
    readonly esgFrameworks: string[];
    readonly subscriptionPlan: z.infer<typeof OrgConfigDTOSchema>['subscriptionPlan'];
    readonly status: z.infer<typeof LifecycleStatusSchema>;
    readonly adminContact: {
        name: string;
        email: string;
        phone?: string;
    };
    readonly createdAt?: string;
    readonly updatedAt?: string;
    constructor(orgId: string, name: string, legalName: string, taxId: string, industrySector: z.infer<typeof OrgConfigDTOSchema>['industrySector'], hqAddress: string, websiteUrl: string | undefined, logoUrl: string | undefined, primaryLanguage: string | null | undefined, unitSystem: 'METRIC' | 'IMPERIAL' | null | undefined, currency: z.infer<typeof OrgConfigDTOSchema>['currency'], reportingCurrency: z.infer<typeof OrgConfigDTOSchema>['reportingCurrency'], fiscalYearStart: number | null | undefined, totalGlobalM2: number, baselineYear: number, targetYear: number, reductionTarget: number, minConfidence: number, esgFrameworks: string[] | null | undefined, subscriptionPlan: z.infer<typeof OrgConfigDTOSchema>['subscriptionPlan'], status: z.infer<typeof LifecycleStatusSchema> | null | undefined, adminContact: {
        name: string;
        email: string;
        phone?: string;
    }, createdAt?: string, updatedAt?: string);
    /**
     * Legacy/back-compat: aún usado por UI y persistencia.
     * El estándar Enterprise lo agrupa bajo "Localización".
     */
    readonly defaultTimeZone: string;
}
export type OrganizationDTOInput = z.infer<typeof OrganizationDTOSchema>;
export declare const parseOrganizationDTO: (input: unknown) => OrganizationDTO;
export declare const safeParseOrganizationDTO: (input: unknown) => z.SafeParseReturnType<{
    name: string;
    currency: "ILS";
    orgId: string;
    taxId: string;
    hqAddress: string;
    totalGlobalM2: number;
    industrySector: "MANUFACTURING";
    reportingCurrency: "USD";
    minConfidence: number;
    baselineYear: number;
    reductionTarget: number;
    targetYear: number;
    subscriptionPlan: "ENTERPRISE";
    legalName: string;
    adminContact: {
        name: string;
        email: string;
        phone?: string | undefined;
    };
    status?: "INACTIVE" | "ACTIVE" | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    websiteUrl?: string | undefined;
    logoUrl?: string | undefined;
    primaryLanguage?: unknown;
    unitSystem?: unknown;
    defaultTimeZone?: unknown;
    fiscalYearStart?: unknown;
    esgFrameworks?: string[] | undefined;
}, {
    status: "INACTIVE" | "ACTIVE";
    name: string;
    currency: "ILS";
    orgId: string;
    taxId: string;
    hqAddress: string;
    totalGlobalM2: number;
    industrySector: "MANUFACTURING";
    reportingCurrency: "USD";
    minConfidence: number;
    baselineYear: number;
    reductionTarget: number;
    targetYear: number;
    subscriptionPlan: "ENTERPRISE";
    legalName: string;
    primaryLanguage: string;
    unitSystem: "METRIC" | "IMPERIAL";
    defaultTimeZone: string;
    fiscalYearStart: number;
    adminContact: {
        name: string;
        email: string;
        phone?: string | undefined;
    };
    esgFrameworks: string[];
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    websiteUrl?: string | undefined;
    logoUrl?: string | undefined;
}>;
//# sourceMappingURL=organization.dto.d.ts.map