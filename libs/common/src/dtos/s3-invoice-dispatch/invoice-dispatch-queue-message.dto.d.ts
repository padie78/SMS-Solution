import { z } from 'zod';
/** Cuerpo JSON enviado a SQS por el dispatcher (`PENDING_WORKER`). */
export declare const InvoiceDispatchQueueMessageSchema: z.ZodObject<{
    bucket: z.ZodString;
    key: z.ZodString;
    orgId: z.ZodUnion<[z.ZodString, z.ZodString]>;
    sk: z.ZodString;
    timestamp: z.ZodEffects<z.ZodString, string, string>;
    status: z.ZodLiteral<"PENDING_WORKER">;
}, "strip", z.ZodTypeAny, {
    status: "PENDING_WORKER";
    orgId: string;
    sk: string;
    timestamp: string;
    bucket: string;
    key: string;
}, {
    status: "PENDING_WORKER";
    orgId: string;
    sk: string;
    timestamp: string;
    bucket: string;
    key: string;
}>;
export type InvoiceDispatchQueueMessage = z.infer<typeof InvoiceDispatchQueueMessageSchema>;
export declare function parseInvoiceDispatchQueueMessage(input: unknown): InvoiceDispatchQueueMessage;
export declare function safeParseInvoiceDispatchQueueMessage(input: unknown): z.SafeParseReturnType<{
    status: "PENDING_WORKER";
    orgId: string;
    sk: string;
    timestamp: string;
    bucket: string;
    key: string;
}, {
    status: "PENDING_WORKER";
    orgId: string;
    sk: string;
    timestamp: string;
    bucket: string;
    key: string;
}>;
//# sourceMappingURL=invoice-dispatch-queue-message.dto.d.ts.map