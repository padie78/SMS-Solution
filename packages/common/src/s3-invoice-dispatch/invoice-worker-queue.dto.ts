import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { InvoiceSkSchema } from './invoice-sk.schema.js';
import {
  safeParseInvoiceDispatchQueueMessage,
  type InvoiceDispatchQueueMessage
} from './invoice-dispatch-queue-message.dto.js';

/**
 * Mensajes antiguos / tests sin `status` ni `timestamp` estrictos.
 * Campos extra se conservan para forwards-compat del pipeline.
 */
export const InvoiceWorkerLegacyQueueBodySchema = z
  .object({
    bucket: z.string().min(1),
    key: z.string().min(1),
    orgId: SmsIdSchema.optional(),
    sk: InvoiceSkSchema.optional(),
    timestamp: z.string().optional(),
    status: z.string().optional()
  })
  .passthrough();

export type InvoiceWorkerLegacyQueueBody = z.infer<typeof InvoiceWorkerLegacyQueueBodySchema>;

/** Entrada normalizada hacia `invoicePipeline` / `PipelineRunner.run`. */
export type InvoiceWorkerPipelineInput = (
  | InvoiceDispatchQueueMessage
  | (InvoiceWorkerLegacyQueueBody & { orgId: string; sk?: string })
) &
  Record<string, unknown>;

/**
 * Valida el JSON del mensaje SQS: formato oficial del dispatcher o legado.
 * @throws {import('zod').ZodError} si el cuerpo no cumple ningún contrato.
 */
export function parseInvoiceWorkerPipelineInput(
  body: unknown,
  defaultOrgId: string
): InvoiceWorkerPipelineInput {
  const official = safeParseInvoiceDispatchQueueMessage(body);
  if (official.success) {
    return { ...official.data };
  }

  const legacy = InvoiceWorkerLegacyQueueBodySchema.safeParse(body);
  if (!legacy.success) {
    throw legacy.error;
  }

  const d = legacy.data;
  const orgId = d.orgId ?? defaultOrgId;
  SmsIdSchema.parse(orgId);

  return { ...d, orgId };
}
