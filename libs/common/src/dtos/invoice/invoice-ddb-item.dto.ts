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
import { EnergyServiceTypeSchema } from '../common/graphql-setup-enums.js';
import { InvoiceSkSchema } from '../../schemas/invoice-sk.schema.js';
import { InvoiceAuditTrailSchema } from './invoice-audit-trail.dto.js';

/** Estados operativos del item Invoice a lo largo de su ciclo de vida. */
export const InvoiceLifecycleStatusSchema = z.enum([
  'UPLOADED',
  'PROCESSING',
  'READY_FOR_REVIEW',
  'PROCESSED',
  'CONFIRMED',
  'FAILED'
]);
export type InvoiceLifecycleStatus = z.infer<typeof InvoiceLifecycleStatusSchema>;

/** Método de cálculo aplicado por la IA / pipeline de cómputo de emisiones. */
export const InvoiceCalculationMethodSchema = z.enum([
  'consumption_based',
  'spend_based',
  'fuel_based'
]);
export type InvoiceCalculationMethod = z.infer<typeof InvoiceCalculationMethodSchema>;

/** Período de facturación detectado en el PDF (ISO date strings). */
export const InvoiceBillingPeriodSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1)
});
export type InvoiceBillingPeriod = z.infer<typeof InvoiceBillingPeriodSchema>;

/**
 * Datos extraídos del documento por OCR + LLM y luego validados por el usuario.
 * Incluye `VENDOR_TAX_ID` en mayúsculas para mantener compatibilidad con el
 * worker (regla 8.x: auditabilidad — nunca renombrar campos persistidos).
 */
export const InvoiceExtractedDataSchema = z.object({
  vendor: z.string().min(1),
  VENDOR_TAX_ID: z.string().min(1),
  invoice_number: z.string().min(1),
  invoice_date: z.string().min(1),
  billing_period: InvoiceBillingPeriodSchema,
  total_amount: z.number().finite().nonnegative()
});
export type InvoiceExtractedData = z.infer<typeof InvoiceExtractedDataSchema>;

/** Diagnóstico libre del LLM (trazabilidad / auditoría GHG). */
export const InvoiceThoughtProcessSchema = z.object({
  detected_raw_values: z.array(z.string()),
  missing_data_strategy: z.string(),
  monetary_vs_physical_check: z.string()
});
export type InvoiceThoughtProcess = z.infer<typeof InvoiceThoughtProcessSchema>;

/** Análisis IA: clasificación + métrica física que alimenta Climatiq. */
export const InvoiceAiAnalysisSchema = z.object({
  activity_id: z.string().min(1),
  calculation_method: InvoiceCalculationMethodSchema,
  confidence_score: z.number().min(0).max(1),
  requires_review: z.boolean(),
  service_type: EnergyServiceTypeSchema,
  unit: z.string().min(1),
  value: z.number().finite().nonnegative(),
  year: z.number().int().min(2000).max(2100)
});
export type InvoiceAiAnalysis = z.infer<typeof InvoiceAiAnalysisSchema>;

/** Dimensiones para slicing analítico (GSI time-series y filtros). */
export const InvoiceAnalyticsDimensionsSchema = z.object({
  asset_id: z.string().min(1),
  branch_id: z.string().min(1),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(2000).max(2100),
  sector: z.string().min(1)
});
export type InvoiceAnalyticsDimensions = z.infer<typeof InvoiceAnalyticsDimensionsSchema>;

/** Resultado de Climatiq (CO2e + huella). */
export const InvoiceClimatiqResultSchema = z.object({
  co2e: z.number().finite().nonnegative(),
  co2e_unit: z.string().min(1),
  timestamp: z.string().min(1)
});
export type InvoiceClimatiqResult = z.infer<typeof InvoiceClimatiqResultSchema>;

/** Metadata operacional (S3, status processing, audit trail). */
export const InvoiceMetadataSchema = z.object({
  s3_key: z.string().min(1),
  status: InvoiceLifecycleStatusSchema,
  technical_hash: z.string().min(1),
  thought_process: InvoiceThoughtProcessSchema,
  upload_date: z.string().min(1)
});
export type InvoiceMetadata = z.infer<typeof InvoiceMetadataSchema>;

/**
 * Item DynamoDB completo de una factura (estado terminal `PROCESSED`).
 * Cuando el frontend confirma la factura, este es el shape resultante en DDB.
 *
 * `audit_trail` es append-only (regla 8.x / GHG Protocol traceability).
 */
export const InvoiceDdbItemSchema = z.object({
  PK: z.string().min(1),
  SK: InvoiceSkSchema,
  ai_analysis: InvoiceAiAnalysisSchema,
  analytics_dimensions: InvoiceAnalyticsDimensionsSchema,
  audit_trail: InvoiceAuditTrailSchema,
  climatiq_result: InvoiceClimatiqResultSchema,
  extracted_data: InvoiceExtractedDataSchema,
  metadata: InvoiceMetadataSchema,
  processed_at: z.string().min(1),
  total_days_prorated: z.number().int().nonnegative()
});
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
export const InvoiceConfirmPayloadSchema = z.object({
  extracted_data: InvoiceExtractedDataSchema,
  ai_analysis: InvoiceAiAnalysisSchema.pick({
    service_type: true,
    value: true,
    unit: true,
    year: true,
    calculation_method: true,
    requires_review: true
  }),
  analytics_dimensions: InvoiceAnalyticsDimensionsSchema.pick({
    asset_id: true,
    period_year: true,
    period_month: true
  })
});
export type InvoiceConfirmPayload = z.infer<typeof InvoiceConfirmPayloadSchema>;

export const parseInvoiceDdbItem = (input: unknown): InvoiceDdbItem =>
  InvoiceDdbItemSchema.parse(input);

export const safeParseInvoiceDdbItem = (input: unknown) => InvoiceDdbItemSchema.safeParse(input);

export const parseInvoiceConfirmPayload = (input: unknown): InvoiceConfirmPayload =>
  InvoiceConfirmPayloadSchema.parse(input);

export const safeParseInvoiceConfirmPayload = (input: unknown) =>
  InvoiceConfirmPayloadSchema.safeParse(input);
