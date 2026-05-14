import { z } from 'zod';
import { type InvoiceDispatchQueueMessage } from './invoice-dispatch-queue-message.dto.js';
/**
 * Mensajes antiguos / tests sin `status` ni `timestamp` estrictos.
 * Campos extra se conservan para forwards-compat del pipeline.
 */
export declare const InvoiceWorkerLegacyQueueBodySchema: z.ZodObject<{
    bucket: z.ZodString;
    key: z.ZodString;
    orgId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    sk: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    bucket: z.ZodString;
    key: z.ZodString;
    orgId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    sk: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    bucket: z.ZodString;
    key: z.ZodString;
    orgId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    sk: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export type InvoiceWorkerLegacyQueueBody = z.infer<typeof InvoiceWorkerLegacyQueueBodySchema>;
/** Entrada normalizada hacia `invoicePipeline` / `PipelineRunner.run`. */
export type InvoiceWorkerPipelineInput = (InvoiceDispatchQueueMessage | (InvoiceWorkerLegacyQueueBody & {
    orgId: string;
    sk?: string;
})) & Record<string, unknown>;
/**
 * Valida el JSON del mensaje SQS: formato oficial del dispatcher o legado.
 * @throws {import('zod').ZodError} si el cuerpo no cumple ningún contrato.
 */
export declare function parseInvoiceWorkerPipelineInput(body: unknown, defaultOrgId: string): InvoiceWorkerPipelineInput;
//# sourceMappingURL=invoice-worker-queue.dto.d.ts.map