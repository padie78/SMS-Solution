/**
 * Audit trail tipado del ítem `Invoice` a lo largo de su ciclo de vida.
 *
 * Cada transición (skeleton, OCR, LLM, Climatiq, validación humana,
 * confirmación, fallo) DEBE appendear una entrada a `audit_trail`. Esto es
 * requisito explícito de:
 *  - `.cursorrules` §4 (cada record enlazado a su fuente; auditabilidad ESG).
 *  - `.cursorrules` §8 (Success/Failure del extraction logueado en audit_trail).
 *  - GHG Protocol — trazabilidad de Scope 1/2/3 para auditoría externa.
 *
 * Mantener este shape como append-only en DynamoDB (`list_append`) — nunca
 * sobrescribir entradas previas: la integridad del audit trail es la base de
 * la verificación ESG.
 */
import { z } from 'zod';

/** Actor lógico (servicio/usuario) que produjo el evento. */
export const InvoiceAuditActorSchema = z.enum([
  'SYSTEM_S3_TRIGGER',
  'WORKER_OCR',
  'WORKER_LLM',
  'WORKER_CLIMATIQ',
  'USER'
]);
export type InvoiceAuditActor = z.infer<typeof InvoiceAuditActorSchema>;

/** Acción realizada sobre el ítem. */
export const InvoiceAuditActionSchema = z.enum([
  'CREATED_DRAFT',
  'OCR_EXTRACTED',
  'LLM_ANALYZED',
  'CLIMATIQ_COMPUTED',
  'USER_VALIDATED',
  'CONFIRMED',
  'FAILED'
]);
export type InvoiceAuditAction = z.infer<typeof InvoiceAuditActionSchema>;

/** Canal de ingesta del documento (alineado con regla 8.x: `ingestion_source`). */
export const InvoiceAuditSourceSchema = z.enum([
  'EMAIL',
  'PORTAL',
  'API',
  'FISCAL',
  'MOBILE'
]);
export type InvoiceAuditSource = z.infer<typeof InvoiceAuditSourceSchema>;

/** Entrada individual del audit trail. */
export const InvoiceAuditEntrySchema = z.object({
  actor: InvoiceAuditActorSchema,
  action: InvoiceAuditActionSchema,
  timestamp: z.string().min(1),
  source: InvoiceAuditSourceSchema.optional(),
  /** Texto libre opcional: error message, request id, hash documental, etc. */
  details: z.string().optional()
});
export type InvoiceAuditEntry = z.infer<typeof InvoiceAuditEntrySchema>;

/** Lista append-only de entradas. */
export const InvoiceAuditTrailSchema = z.array(InvoiceAuditEntrySchema);
export type InvoiceAuditTrail = z.infer<typeof InvoiceAuditTrailSchema>;

/** Helper para construir la entrada inicial cuando el dispatcher crea el skeleton. */
export function buildInitialAuditEntry(params: {
  timestamp: string;
  source?: InvoiceAuditSource;
  details?: string;
}): InvoiceAuditEntry {
  return InvoiceAuditEntrySchema.parse({
    actor: 'SYSTEM_S3_TRIGGER',
    action: 'CREATED_DRAFT',
    timestamp: params.timestamp,
    source: params.source,
    details: params.details
  });
}
