import { z } from 'zod';
/** Respuesta del caso de uso dispatcher tras encolar el worker. */
export declare const DispatcherEnqueueResultSchema: z.ZodObject<{
    status: z.ZodLiteral<"ENQUEUED">;
    invoiceId: z.ZodString;
    orgId: z.ZodUnion<[z.ZodString, z.ZodString]>;
    key: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ENQUEUED";
    orgId: string;
    invoiceId: string;
    key: string;
}, {
    status: "ENQUEUED";
    orgId: string;
    invoiceId: string;
    key: string;
}>;
export type DispatcherEnqueueResult = z.infer<typeof DispatcherEnqueueResultSchema>;
export declare function parseDispatcherEnqueueResult(input: unknown): DispatcherEnqueueResult;
//# sourceMappingURL=dispatcher-enqueue-result.dto.d.ts.map