import { InvoiceSkSchema, SmsIdSchema } from '@sms/common';
import { z } from 'zod';

import type { InvoiceWorkerPipelineInputDto } from '@sms/application';

import { safeParseInvoiceDispatchQueueMessage } from './invoice-dispatch-queue-message.schema.js';

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

/**
 * Valida el JSON del mensaje SQS: formato oficial del dispatcher o legado.
 * @throws {import('zod').ZodError} si el cuerpo no cumple ningún contrato.
 */
export function parseInvoiceWorkerPipelineInput(
  body: unknown,
  defaultOrgId: string
): InvoiceWorkerPipelineInputDto {
  const official = safeParseInvoiceDispatchQueueMessage(body);
  if (official.success) {
    return { ...official.data } as InvoiceWorkerPipelineInputDto;
  }

  const legacy = InvoiceWorkerLegacyQueueBodySchema.safeParse(body);
  if (!legacy.success) {
    throw legacy.error;
  }

  const d = legacy.data;
  const orgId = d.orgId ?? defaultOrgId;
  SmsIdSchema.parse(orgId);

  return { ...d, orgId } as InvoiceWorkerPipelineInputDto;
}
