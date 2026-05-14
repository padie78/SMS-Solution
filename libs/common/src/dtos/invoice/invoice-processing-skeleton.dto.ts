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
import { SmsIdSchema } from '../../schemas/sms-id.schema.js';
import { InvoiceSkSchema } from '../../schemas/invoice-sk.schema.js';
import {
  InvoiceAuditEntrySchema,
  InvoiceAuditSourceSchema,
  buildInitialAuditEntry,
  type InvoiceAuditSource
} from './invoice-audit-trail.dto.js';

/** `extracted_data` con campos opcionales/placeholder (mismas keys que el shape final). */
const SkeletonExtractedDataSchema = z.object({
  vendor: z.string(),
  VENDOR_TAX_ID: z.string(),
  invoice_number: z.string(),
  invoice_date: z.string(),
  billing_period: z.object({
    start: z.string(),
    end: z.string()
  }),
  total_amount: z.number().finite().nonnegative()
});

/** `ai_analysis` mínimo en draft (worker rellena el resto). */
const SkeletonAiAnalysisSchema = z.object({
  activity_id: z.string(),
  calculation_method: z.enum(['consumption_based', 'spend_based', 'fuel_based']),
  confidence_score: z.number().min(0).max(1),
  requires_review: z.boolean(),
  service_type: z.string(),
  unit: z.string(),
  value: z.number().finite().nonnegative(),
  year: z.number().int(),
  /** Flag operacional propio del draft (no presente en shape terminal). */
  status_triage: z.literal('IN_QUEUE')
});

/** `analytics_dimensions` con placeholders (worker/usuario rellena en Review). */
const SkeletonAnalyticsDimensionsSchema = z.object({
  asset_id: z.string(),
  branch_id: z.string(),
  period_month: z.number().int().min(0).max(12),
  period_year: z.number().int().min(0).max(2100),
  sector: z.string()
});

/** `metadata` del draft. `is_draft=true` permite TTL/cleanup si nunca se confirma. */
const SkeletonMetadataSchema = z.object({
  bucket: z.string().min(1),
  s3_key: z.string().min(1),
  status: z.literal('PROCESSING'),
  is_draft: z.literal(true),
  upload_date: z.string().min(1),
  technical_hash: z.string().optional(),
  ingestion_source: InvoiceAuditSourceSchema.optional()
});

/** Esqueleto inicial. `audit_trail` arranca con `CREATED_DRAFT`. */
export const InvoiceProcessingSkeletonSchema = z.object({
  PK: z.string().min(1),
  SK: InvoiceSkSchema,
  ai_analysis: SkeletonAiAnalysisSchema,
  analytics_dimensions: SkeletonAnalyticsDimensionsSchema,
  audit_trail: z.array(InvoiceAuditEntrySchema).min(1),
  climatiq_result: z.record(z.string(), z.unknown()),
  extracted_data: SkeletonExtractedDataSchema,
  metadata: SkeletonMetadataSchema,
  processed_at: z.null()
});

export type InvoiceProcessingSkeleton = z.infer<typeof InvoiceProcessingSkeletonSchema>;

const BuildInvoiceProcessingSkeletonParamsSchema = z.object({
  orgId: SmsIdSchema,
  sk: InvoiceSkSchema,
  s3Key: z.string().min(1),
  bucket: z.string().min(1),
  /** Opcional: canal de ingesta (regla 8.x). Default sin etiqueta. */
  ingestionSource: InvoiceAuditSourceSchema.optional(),
  /** Opcional: hash técnico del PDF (para deduplicación / idempotencia). */
  technicalHash: z.string().optional(),
  /** Opcional: timestamp de upload (default = ahora). */
  uploadDate: z.string().min(1).optional()
});

export type BuildInvoiceProcessingSkeletonParams = z.infer<
  typeof BuildInvoiceProcessingSkeletonParamsSchema
>;

/**
 * Construye el ítem-draft tras un S3 PUT. Idempotente respecto al input.
 * El Dispatcher Lambda hace `PutItem` con `attribute_not_exists(SK)` para
 * evitar overwrites de drafts vivos.
 */
export function buildInvoiceProcessingSkeleton(
  input: unknown
): InvoiceProcessingSkeleton {
  const p = BuildInvoiceProcessingSkeletonParamsSchema.parse(input);
  const now = p.uploadDate ?? new Date().toISOString();
  const initialAudit = buildInitialAuditEntry({
    timestamp: now,
    source: p.ingestionSource as InvoiceAuditSource | undefined,
    details: `s3://${p.bucket}/${p.s3Key}`
  });

  const draft: InvoiceProcessingSkeleton = {
    PK: p.orgId,
    SK: p.sk,
    ai_analysis: {
      activity_id: '',
      calculation_method: 'consumption_based',
      confidence_score: 0,
      requires_review: true,
      service_type: '',
      unit: '',
      value: 0,
      year: 0,
      status_triage: 'IN_QUEUE'
    },
    analytics_dimensions: {
      asset_id: '',
      branch_id: '',
      period_month: 0,
      period_year: 0,
      sector: ''
    },
    audit_trail: [initialAudit],
    climatiq_result: {},
    extracted_data: {
      vendor: '',
      VENDOR_TAX_ID: '',
      invoice_number: '',
      invoice_date: '',
      billing_period: { start: '', end: '' },
      total_amount: 0
    },
    metadata: {
      bucket: p.bucket,
      s3_key: p.s3Key,
      status: 'PROCESSING',
      is_draft: true,
      upload_date: now,
      technical_hash: p.technicalHash,
      ingestion_source: p.ingestionSource
    },
    processed_at: null
  };
  return InvoiceProcessingSkeletonSchema.parse(draft);
}
