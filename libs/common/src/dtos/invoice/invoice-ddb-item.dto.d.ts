/**
 * Shape canónico del ítem DynamoDB para una factura (post-procesamiento).
 *
 * Espejo 1:1 del documento Dynamo (PK/SK + extracted_data + ai_analysis +
 * climatiq_result + analytics_dimensions + metadata + audit/processing fields).
 *
 * Este schema es la fuente única de verdad compartida entre:
 *  - Worker Lambda (escritura post-IA / OCR / Climatiq).
 *  - API Lambda (validación de ConfirmInvoice).
 *  - Frontend Angular (form de revisión + preview JSON).
 */
import { z } from 'zod';
/** Estados operativos del item Invoice a lo largo de su ciclo de vida. */
export declare const InvoiceLifecycleStatusSchema: z.ZodEnum<["UPLOADED", "PROCESSING", "READY_FOR_REVIEW", "PROCESSED", "CONFIRMED", "FAILED"]>;
export type InvoiceLifecycleStatus = z.infer<typeof InvoiceLifecycleStatusSchema>;
/** Método de cálculo aplicado por la IA / pipeline de cómputo de emisiones. */
export declare const InvoiceCalculationMethodSchema: z.ZodEnum<["consumption_based", "spend_based", "fuel_based"]>;
export type InvoiceCalculationMethod = z.infer<typeof InvoiceCalculationMethodSchema>;
/** Período de facturación detectado en el PDF (ISO date strings). */
export declare const InvoiceBillingPeriodSchema: z.ZodObject<{
    start: z.ZodString;
    end: z.ZodString;
}, "strip", z.ZodTypeAny, {
    start: string;
    end: string;
}, {
    start: string;
    end: string;
}>;
export type InvoiceBillingPeriod = z.infer<typeof InvoiceBillingPeriodSchema>;
/**
 * Datos extraídos del documento por OCR + LLM y luego validados por el usuario.
 * Incluye `VENDOR_TAX_ID` en mayúsculas para mantener compatibilidad con el
 * worker (regla 8.x: auditabilidad — nunca renombrar campos persistidos).
 */
export declare const InvoiceExtractedDataSchema: z.ZodObject<{
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
export type InvoiceExtractedData = z.infer<typeof InvoiceExtractedDataSchema>;
/** Diagnóstico libre del LLM (trazabilidad / auditoría GHG). */
export declare const InvoiceThoughtProcessSchema: z.ZodObject<{
    detected_raw_values: z.ZodArray<z.ZodString, "many">;
    missing_data_strategy: z.ZodString;
    monetary_vs_physical_check: z.ZodString;
}, "strip", z.ZodTypeAny, {
    detected_raw_values: string[];
    missing_data_strategy: string;
    monetary_vs_physical_check: string;
}, {
    detected_raw_values: string[];
    missing_data_strategy: string;
    monetary_vs_physical_check: string;
}>;
export type InvoiceThoughtProcess = z.infer<typeof InvoiceThoughtProcessSchema>;
/** Análisis IA: clasificación + métrica física que alimenta Climatiq. */
export declare const InvoiceAiAnalysisSchema: z.ZodObject<{
    activity_id: z.ZodString;
    calculation_method: z.ZodEnum<["consumption_based", "spend_based", "fuel_based"]>;
    confidence_score: z.ZodNumber;
    requires_review: z.ZodBoolean;
    service_type: z.ZodEnum<["ELECTRICITY", "GAS", "WATER", "STEAM"]>;
    unit: z.ZodString;
    value: z.ZodNumber;
    year: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    value: number;
    unit: string;
    year: number;
    activity_id: string;
    calculation_method: "consumption_based" | "spend_based" | "fuel_based";
    confidence_score: number;
    requires_review: boolean;
    service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
}, {
    value: number;
    unit: string;
    year: number;
    activity_id: string;
    calculation_method: "consumption_based" | "spend_based" | "fuel_based";
    confidence_score: number;
    requires_review: boolean;
    service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
}>;
export type InvoiceAiAnalysis = z.infer<typeof InvoiceAiAnalysisSchema>;
/** Dimensiones para slicing analítico (GSI time-series y filtros). */
export declare const InvoiceAnalyticsDimensionsSchema: z.ZodObject<{
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
export type InvoiceAnalyticsDimensions = z.infer<typeof InvoiceAnalyticsDimensionsSchema>;
/** Resultado de Climatiq (CO2e + huella). */
export declare const InvoiceClimatiqResultSchema: z.ZodObject<{
    co2e: z.ZodNumber;
    co2e_unit: z.ZodString;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    co2e: number;
    timestamp: string;
    co2e_unit: string;
}, {
    co2e: number;
    timestamp: string;
    co2e_unit: string;
}>;
export type InvoiceClimatiqResult = z.infer<typeof InvoiceClimatiqResultSchema>;
/** Metadata operacional (S3, status processing, audit trail). */
export declare const InvoiceMetadataSchema: z.ZodObject<{
    s3_key: z.ZodString;
    status: z.ZodEnum<["UPLOADED", "PROCESSING", "READY_FOR_REVIEW", "PROCESSED", "CONFIRMED", "FAILED"]>;
    technical_hash: z.ZodString;
    thought_process: z.ZodObject<{
        detected_raw_values: z.ZodArray<z.ZodString, "many">;
        missing_data_strategy: z.ZodString;
        monetary_vs_physical_check: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        detected_raw_values: string[];
        missing_data_strategy: string;
        monetary_vs_physical_check: string;
    }, {
        detected_raw_values: string[];
        missing_data_strategy: string;
        monetary_vs_physical_check: string;
    }>;
    upload_date: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "CONFIRMED" | "FAILED" | "PROCESSING" | "UPLOADED" | "READY_FOR_REVIEW" | "PROCESSED";
    s3_key: string;
    upload_date: string;
    technical_hash: string;
    thought_process: {
        detected_raw_values: string[];
        missing_data_strategy: string;
        monetary_vs_physical_check: string;
    };
}, {
    status: "CONFIRMED" | "FAILED" | "PROCESSING" | "UPLOADED" | "READY_FOR_REVIEW" | "PROCESSED";
    s3_key: string;
    upload_date: string;
    technical_hash: string;
    thought_process: {
        detected_raw_values: string[];
        missing_data_strategy: string;
        monetary_vs_physical_check: string;
    };
}>;
export type InvoiceMetadata = z.infer<typeof InvoiceMetadataSchema>;
/**
 * Item DynamoDB completo de una factura (estado terminal `PROCESSED`).
 * Cuando el frontend confirma la factura, este es el shape resultante en DDB.
 *
 * `audit_trail` es append-only (regla 8.x / GHG Protocol traceability).
 */
export declare const InvoiceDdbItemSchema: z.ZodObject<{
    PK: z.ZodString;
    SK: z.ZodString;
    ai_analysis: z.ZodObject<{
        activity_id: z.ZodString;
        calculation_method: z.ZodEnum<["consumption_based", "spend_based", "fuel_based"]>;
        confidence_score: z.ZodNumber;
        requires_review: z.ZodBoolean;
        service_type: z.ZodEnum<["ELECTRICITY", "GAS", "WATER", "STEAM"]>;
        unit: z.ZodString;
        value: z.ZodNumber;
        year: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: string;
        year: number;
        activity_id: string;
        calculation_method: "consumption_based" | "spend_based" | "fuel_based";
        confidence_score: number;
        requires_review: boolean;
        service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
    }, {
        value: number;
        unit: string;
        year: number;
        activity_id: string;
        calculation_method: "consumption_based" | "spend_based" | "fuel_based";
        confidence_score: number;
        requires_review: boolean;
        service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
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
    climatiq_result: z.ZodObject<{
        co2e: z.ZodNumber;
        co2e_unit: z.ZodString;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        co2e: number;
        timestamp: string;
        co2e_unit: string;
    }, {
        co2e: number;
        timestamp: string;
        co2e_unit: string;
    }>;
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
        s3_key: z.ZodString;
        status: z.ZodEnum<["UPLOADED", "PROCESSING", "READY_FOR_REVIEW", "PROCESSED", "CONFIRMED", "FAILED"]>;
        technical_hash: z.ZodString;
        thought_process: z.ZodObject<{
            detected_raw_values: z.ZodArray<z.ZodString, "many">;
            missing_data_strategy: z.ZodString;
            monetary_vs_physical_check: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            detected_raw_values: string[];
            missing_data_strategy: string;
            monetary_vs_physical_check: string;
        }, {
            detected_raw_values: string[];
            missing_data_strategy: string;
            monetary_vs_physical_check: string;
        }>;
        upload_date: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "CONFIRMED" | "FAILED" | "PROCESSING" | "UPLOADED" | "READY_FOR_REVIEW" | "PROCESSED";
        s3_key: string;
        upload_date: string;
        technical_hash: string;
        thought_process: {
            detected_raw_values: string[];
            missing_data_strategy: string;
            monetary_vs_physical_check: string;
        };
    }, {
        status: "CONFIRMED" | "FAILED" | "PROCESSING" | "UPLOADED" | "READY_FOR_REVIEW" | "PROCESSED";
        s3_key: string;
        upload_date: string;
        technical_hash: string;
        thought_process: {
            detected_raw_values: string[];
            missing_data_strategy: string;
            monetary_vs_physical_check: string;
        };
    }>;
    processed_at: z.ZodString;
    total_days_prorated: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    metadata: {
        status: "CONFIRMED" | "FAILED" | "PROCESSING" | "UPLOADED" | "READY_FOR_REVIEW" | "PROCESSED";
        s3_key: string;
        upload_date: string;
        technical_hash: string;
        thought_process: {
            detected_raw_values: string[];
            missing_data_strategy: string;
            monetary_vs_physical_check: string;
        };
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
        service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
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
    climatiq_result: {
        co2e: number;
        timestamp: string;
        co2e_unit: string;
    };
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
    processed_at: string;
    total_days_prorated: number;
}, {
    metadata: {
        status: "CONFIRMED" | "FAILED" | "PROCESSING" | "UPLOADED" | "READY_FOR_REVIEW" | "PROCESSED";
        s3_key: string;
        upload_date: string;
        technical_hash: string;
        thought_process: {
            detected_raw_values: string[];
            missing_data_strategy: string;
            monetary_vs_physical_check: string;
        };
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
        service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
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
    climatiq_result: {
        co2e: number;
        timestamp: string;
        co2e_unit: string;
    };
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
    processed_at: string;
    total_days_prorated: number;
}>;
export type InvoiceDdbItem = z.infer<typeof InvoiceDdbItemSchema>;
/**
 * Subset que el frontend envía al backend en la mutation `confirmInvoice`.
 * Contiene únicamente lo que el USUARIO valida / clasifica:
 *  - `extracted_data` validado por el usuario (campos del OCR corregidos).
 *  - `ai_analysis` (clasificación final + métricas validadas).
 *  - `analytics_dimensions` (asset/periodo).
 *
 * NO incluye `metadata` ni `processed_at` ni `audit_trail`: esos los escribe
 * el Lambda `confirmInvoice` al recibir el payload (no son responsabilidad
 * del cliente y enviarlos abriría una vía de tampering del audit log).
 *
 * El worker enriquece después con `climatiq_result`, `thought_process` y
 * `total_days_prorated` (cálculos derivados, no editables por humano).
 */
export declare const InvoiceConfirmPayloadSchema: z.ZodObject<{
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
    ai_analysis: z.ZodObject<Pick<{
        activity_id: z.ZodString;
        calculation_method: z.ZodEnum<["consumption_based", "spend_based", "fuel_based"]>;
        confidence_score: z.ZodNumber;
        requires_review: z.ZodBoolean;
        service_type: z.ZodEnum<["ELECTRICITY", "GAS", "WATER", "STEAM"]>;
        unit: z.ZodString;
        value: z.ZodNumber;
        year: z.ZodNumber;
    }, "value" | "unit" | "year" | "calculation_method" | "requires_review" | "service_type">, "strip", z.ZodTypeAny, {
        value: number;
        unit: string;
        year: number;
        calculation_method: "consumption_based" | "spend_based" | "fuel_based";
        requires_review: boolean;
        service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
    }, {
        value: number;
        unit: string;
        year: number;
        calculation_method: "consumption_based" | "spend_based" | "fuel_based";
        requires_review: boolean;
        service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
    }>;
    analytics_dimensions: z.ZodObject<Pick<{
        asset_id: z.ZodString;
        branch_id: z.ZodString;
        period_month: z.ZodNumber;
        period_year: z.ZodNumber;
        sector: z.ZodString;
    }, "asset_id" | "period_month" | "period_year">, "strip", z.ZodTypeAny, {
        asset_id: string;
        period_month: number;
        period_year: number;
    }, {
        asset_id: string;
        period_month: number;
        period_year: number;
    }>;
}, "strip", z.ZodTypeAny, {
    ai_analysis: {
        value: number;
        unit: string;
        year: number;
        calculation_method: "consumption_based" | "spend_based" | "fuel_based";
        requires_review: boolean;
        service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
    };
    analytics_dimensions: {
        asset_id: string;
        period_month: number;
        period_year: number;
    };
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
}, {
    ai_analysis: {
        value: number;
        unit: string;
        year: number;
        calculation_method: "consumption_based" | "spend_based" | "fuel_based";
        requires_review: boolean;
        service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
    };
    analytics_dimensions: {
        asset_id: string;
        period_month: number;
        period_year: number;
    };
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
}>;
export type InvoiceConfirmPayload = z.infer<typeof InvoiceConfirmPayloadSchema>;
export declare const parseInvoiceDdbItem: (input: unknown) => InvoiceDdbItem;
export declare const safeParseInvoiceDdbItem: (input: unknown) => z.SafeParseReturnType<{
    metadata: {
        status: "CONFIRMED" | "FAILED" | "PROCESSING" | "UPLOADED" | "READY_FOR_REVIEW" | "PROCESSED";
        s3_key: string;
        upload_date: string;
        technical_hash: string;
        thought_process: {
            detected_raw_values: string[];
            missing_data_strategy: string;
            monetary_vs_physical_check: string;
        };
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
        service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
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
    climatiq_result: {
        co2e: number;
        timestamp: string;
        co2e_unit: string;
    };
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
    processed_at: string;
    total_days_prorated: number;
}, {
    metadata: {
        status: "CONFIRMED" | "FAILED" | "PROCESSING" | "UPLOADED" | "READY_FOR_REVIEW" | "PROCESSED";
        s3_key: string;
        upload_date: string;
        technical_hash: string;
        thought_process: {
            detected_raw_values: string[];
            missing_data_strategy: string;
            monetary_vs_physical_check: string;
        };
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
        service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
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
    climatiq_result: {
        co2e: number;
        timestamp: string;
        co2e_unit: string;
    };
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
    processed_at: string;
    total_days_prorated: number;
}>;
export declare const parseInvoiceConfirmPayload: (input: unknown) => InvoiceConfirmPayload;
export declare const safeParseInvoiceConfirmPayload: (input: unknown) => z.SafeParseReturnType<{
    ai_analysis: {
        value: number;
        unit: string;
        year: number;
        calculation_method: "consumption_based" | "spend_based" | "fuel_based";
        requires_review: boolean;
        service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
    };
    analytics_dimensions: {
        asset_id: string;
        period_month: number;
        period_year: number;
    };
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
}, {
    ai_analysis: {
        value: number;
        unit: string;
        year: number;
        calculation_method: "consumption_based" | "spend_based" | "fuel_based";
        requires_review: boolean;
        service_type: "ELECTRICITY" | "GAS" | "WATER" | "STEAM";
    };
    analytics_dimensions: {
        asset_id: string;
        period_month: number;
        period_year: number;
    };
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
}>;
//# sourceMappingURL=invoice-ddb-item.dto.d.ts.map