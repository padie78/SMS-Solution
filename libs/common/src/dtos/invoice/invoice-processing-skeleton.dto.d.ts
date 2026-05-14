/**
 * Skeleton DynamoDB del ítem `Invoice` recién subido (estado inicial `PROCESSING`).
 *
 * Diseñado para ser **shape-compatible** con `InvoiceDdbItem` (mismos atributos
 * top-level y mismas sub-keys), de modo que el worker pueda promoverlo a estado
 * terminal con `UpdateItem` puntual (SET expressions) sin tener que recrear el
 * ítem ni migrar shapes entre fases. Esto elimina lecturas/escrituras extras y
 * reduce huella de carbono del pipeline (regla 8 — Green IT).
 *
 * Diferencias controladas vs el shape terminal:
 *  - `metadata.status` arranca en `'PROCESSING'` (vs `'PROCESSED'`).
 *  - `metadata.is_draft` = true (flag explícito de borrador no validado).
 *  - Campos pendientes de OCR/LLM se inicializan con placeholders explícitos
 *    (strings vacíos / `0`), nunca con `undefined` (DynamoDB es schemaless
 *    pero los consumidores TS esperan keys presentes).
 *  - `processed_at` = null (lo setea el Lambda al confirmar).
 *  - `audit_trail` contiene la primera entrada `CREATED_DRAFT`.
 *
 * Este skeleton lo crea el Dispatcher Lambda al recibir el evento S3 PUT.
 */
import { z } from 'zod';
/** Esqueleto inicial. `audit_trail` arranca con `CREATED_DRAFT`. */
export declare const InvoiceProcessingSkeletonSchema: z.ZodObject<{
    PK: z.ZodString;
    SK: z.ZodString;
    ai_analysis: z.ZodObject<{
        activity_id: z.ZodString;
        calculation_method: z.ZodEnum<["consumption_based", "spend_based", "fuel_based"]>;
        confidence_score: z.ZodNumber;
        requires_review: z.ZodBoolean;
        service_type: z.ZodString;
        unit: z.ZodString;
        value: z.ZodNumber;
        year: z.ZodNumber;
        /** Flag operacional propio del draft (no presente en shape terminal). */
        status_triage: z.ZodLiteral<"IN_QUEUE">;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: string;
        year: number;
        activity_id: string;
        calculation_method: "consumption_based" | "spend_based" | "fuel_based";
        confidence_score: number;
        requires_review: boolean;
        service_type: string;
        status_triage: "IN_QUEUE";
    }, {
        value: number;
        unit: string;
        year: number;
        activity_id: string;
        calculation_method: "consumption_based" | "spend_based" | "fuel_based";
        confidence_score: number;
        requires_review: boolean;
        service_type: string;
        status_triage: "IN_QUEUE";
    }>;
    analytics_dimensions: z.ZodObject<{
        asset_id: z.ZodString;
        branch_id: z.ZodString;
        period_month: z.ZodNumber;
        period_year: z.ZodNumber;
        sector: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        sector: string;
        asset_id: string;
        branch_id: string;
        period_month: number;
        period_year: number;
    }, {
        sector: string;
        asset_id: string;
        branch_id: string;
        period_month: number;
        period_year: number;
    }>;
    audit_trail: z.ZodArray<z.ZodObject<{
        actor: z.ZodEnum<["SYSTEM_S3_TRIGGER", "WORKER_OCR", "WORKER_LLM", "WORKER_CLIMATIQ", "USER"]>;
        action: z.ZodEnum<["CREATED_DRAFT", "OCR_EXTRACTED", "LLM_ANALYZED", "CLIMATIQ_COMPUTED", "USER_VALIDATED", "CONFIRMED", "FAILED"]>;
        timestamp: z.ZodString;
        source: z.ZodOptional<z.ZodEnum<["EMAIL", "PORTAL", "API", "FISCAL", "MOBILE"]>>;
        details: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        actor: "SYSTEM_S3_TRIGGER" | "WORKER_OCR" | "WORKER_LLM" | "WORKER_CLIMATIQ" | "USER";
        action: "CREATED_DRAFT" | "OCR_EXTRACTED" | "LLM_ANALYZED" | "CLIMATIQ_COMPUTED" | "USER_VALIDATED" | "CONFIRMED" | "FAILED";
        source?: "EMAIL" | "PORTAL" | "API" | "FISCAL" | "MOBILE" | undefined;
        details?: string | undefined;
    }, {
        timestamp: string;
        actor: "SYSTEM_S3_TRIGGER" | "WORKER_OCR" | "WORKER_LLM" | "WORKER_CLIMATIQ" | "USER";
        action: "CREATED_DRAFT" | "OCR_EXTRACTED" | "LLM_ANALYZED" | "CLIMATIQ_COMPUTED" | "USER_VALIDATED" | "CONFIRMED" | "FAILED";
        source?: "EMAIL" | "PORTAL" | "API" | "FISCAL" | "MOBILE" | undefined;
        details?: string | undefined;
    }>, "many">;
    climatiq_result: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    extracted_data: z.ZodObject<{
        vendor: z.ZodString;
        VENDOR_TAX_ID: z.ZodString;
        invoice_number: z.ZodString;
        invoice_date: z.ZodString;
        billing_period: z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>;
        total_amount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        vendor: string;
        VENDOR_TAX_ID: string;
        invoice_number: string;
        invoice_date: string;
        billing_period: {
            start: string;
            end: string;
        };
        total_amount: number;
    }, {
        vendor: string;
        VENDOR_TAX_ID: string;
        invoice_number: string;
        invoice_date: string;
        billing_period: {
            start: string;
            end: string;
        };
        total_amount: number;
    }>;
    metadata: z.ZodObject<{
        bucket: z.ZodString;
        s3_key: z.ZodString;
        status: z.ZodLiteral<"PROCESSING">;
        is_draft: z.ZodLiteral<true>;
        upload_date: z.ZodString;
        technical_hash: z.ZodOptional<z.ZodString>;
        ingestion_source: z.ZodOptional<z.ZodEnum<["EMAIL", "PORTAL", "API", "FISCAL", "MOBILE"]>>;
    }, "strip", z.ZodTypeAny, {
        status: "PROCESSING";
        bucket: string;
        s3_key: string;
        is_draft: true;
        upload_date: string;
        technical_hash?: string | undefined;
        ingestion_source?: "EMAIL" | "PORTAL" | "API" | "FISCAL" | "MOBILE" | undefined;
    }, {
        status: "PROCESSING";
        bucket: string;
        s3_key: string;
        is_draft: true;
        upload_date: string;
        technical_hash?: string | undefined;
        ingestion_source?: "EMAIL" | "PORTAL" | "API" | "FISCAL" | "MOBILE" | undefined;
    }>;
    processed_at: z.ZodNull;
}, "strip", z.ZodTypeAny, {
    metadata: {
        status: "PROCESSING";
        bucket: string;
        s3_key: string;
        is_draft: true;
        upload_date: string;
        technical_hash?: string | undefined;
        ingestion_source?: "EMAIL" | "PORTAL" | "API" | "FISCAL" | "MOBILE" | undefined;
    };
    PK: string;
    SK: string;
    ai_analysis: {
        value: number;
        unit: string;
        year: number;
        activity_id: string;
        calculation_method: "consumption_based" | "spend_based" | "fuel_based";
        confidence_score: number;
        requires_review: boolean;
        service_type: string;
        status_triage: "IN_QUEUE";
    };
    analytics_dimensions: {
        sector: string;
        asset_id: string;
        branch_id: string;
        period_month: number;
        period_year: number;
    };
    audit_trail: {
        timestamp: string;
        actor: "SYSTEM_S3_TRIGGER" | "WORKER_OCR" | "WORKER_LLM" | "WORKER_CLIMATIQ" | "USER";
        action: "CREATED_DRAFT" | "OCR_EXTRACTED" | "LLM_ANALYZED" | "CLIMATIQ_COMPUTED" | "USER_VALIDATED" | "CONFIRMED" | "FAILED";
        source?: "EMAIL" | "PORTAL" | "API" | "FISCAL" | "MOBILE" | undefined;
        details?: string | undefined;
    }[];
    climatiq_result: Record<string, unknown>;
    extracted_data: {
        vendor: string;
        VENDOR_TAX_ID: string;
        invoice_number: string;
        invoice_date: string;
        billing_period: {
            start: string;
            end: string;
        };
        total_amount: number;
    };
    processed_at: null;
}, {
    metadata: {
        status: "PROCESSING";
        bucket: string;
        s3_key: string;
        is_draft: true;
        upload_date: string;
        technical_hash?: string | undefined;
        ingestion_source?: "EMAIL" | "PORTAL" | "API" | "FISCAL" | "MOBILE" | undefined;
    };
    PK: string;
    SK: string;
    ai_analysis: {
        value: number;
        unit: string;
        year: number;
        activity_id: string;
        calculation_method: "consumption_based" | "spend_based" | "fuel_based";
        confidence_score: number;
        requires_review: boolean;
        service_type: string;
        status_triage: "IN_QUEUE";
    };
    analytics_dimensions: {
        sector: string;
        asset_id: string;
        branch_id: string;
        period_month: number;
        period_year: number;
    };
    audit_trail: {
        timestamp: string;
        actor: "SYSTEM_S3_TRIGGER" | "WORKER_OCR" | "WORKER_LLM" | "WORKER_CLIMATIQ" | "USER";
        action: "CREATED_DRAFT" | "OCR_EXTRACTED" | "LLM_ANALYZED" | "CLIMATIQ_COMPUTED" | "USER_VALIDATED" | "CONFIRMED" | "FAILED";
        source?: "EMAIL" | "PORTAL" | "API" | "FISCAL" | "MOBILE" | undefined;
        details?: string | undefined;
    }[];
    climatiq_result: Record<string, unknown>;
    extracted_data: {
        vendor: string;
        VENDOR_TAX_ID: string;
        invoice_number: string;
        invoice_date: string;
        billing_period: {
            start: string;
            end: string;
        };
        total_amount: number;
    };
    processed_at: null;
}>;
export type InvoiceProcessingSkeleton = z.infer<typeof InvoiceProcessingSkeletonSchema>;
declare const BuildInvoiceProcessingSkeletonParamsSchema: z.ZodObject<{
    orgId: z.ZodUnion<[z.ZodString, z.ZodString]>;
    sk: z.ZodString;
    s3Key: z.ZodString;
    bucket: z.ZodString;
    /** Opcional: canal de ingesta (regla 8.x). Default sin etiqueta. */
    ingestionSource: z.ZodOptional<z.ZodEnum<["EMAIL", "PORTAL", "API", "FISCAL", "MOBILE"]>>;
    /** Opcional: hash técnico del PDF (para deduplicación / idempotencia). */
    technicalHash: z.ZodOptional<z.ZodString>;
    /** Opcional: timestamp de upload (default = ahora). */
    uploadDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    orgId: string;
    sk: string;
    s3Key: string;
    bucket: string;
    technicalHash?: string | undefined;
    uploadDate?: string | undefined;
    ingestionSource?: "EMAIL" | "PORTAL" | "API" | "FISCAL" | "MOBILE" | undefined;
}, {
    orgId: string;
    sk: string;
    s3Key: string;
    bucket: string;
    technicalHash?: string | undefined;
    uploadDate?: string | undefined;
    ingestionSource?: "EMAIL" | "PORTAL" | "API" | "FISCAL" | "MOBILE" | undefined;
}>;
export type BuildInvoiceProcessingSkeletonParams = z.infer<typeof BuildInvoiceProcessingSkeletonParamsSchema>;
/**
 * Construye el ítem-draft tras un S3 PUT. Idempotente respecto al input.
 * El Dispatcher Lambda hace `PutItem` con `attribute_not_exists(SK)` para
 * evitar overwrites de drafts vivos.
 */
export declare function buildInvoiceProcessingSkeleton(input: unknown): InvoiceProcessingSkeleton;
export {};
//# sourceMappingURL=invoice-processing-skeleton.dto.d.ts.map