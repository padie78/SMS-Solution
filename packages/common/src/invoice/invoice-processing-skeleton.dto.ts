import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { InvoiceSkSchema } from '../s3-invoice-dispatch/invoice-sk.schema.js';

/** Ítem DynamoDB al crear el esqueleto tras S3 Put (antes del worker). */
export const InvoiceProcessingSkeletonSchema = z.object({
  PK: z.string().min(1),
  SK: InvoiceSkSchema,
  status: z.literal('PROCESSING'),
  processed_at: z.null(),
  ai_analysis: z.object({
    service_type: z.literal('PENDING'),
    value: z.number(),
    unit: z.string(),
    status_triage: z.literal('IN_QUEUE')
  }),
  climatiq_result: z.record(z.string(), z.unknown()),
  extracted_data: z.object({
    vendor: z.string(),
    total_amount: z.number(),
    currency: z.string(),
    billing_period: z.object({
      start: z.null(),
      end: z.null()
    })
  }),
  metadata: z.object({
    s3_key: z.string().min(1),
    bucket: z.string().min(1),
    status: z.literal('UPLOADED'),
    is_draft: z.literal(true)
  })
});

export type InvoiceProcessingSkeleton = z.infer<typeof InvoiceProcessingSkeletonSchema>;

const BuildInvoiceProcessingSkeletonParamsSchema = z.object({
  orgId: SmsIdSchema,
  sk: InvoiceSkSchema,
  s3Key: z.string().min(1),
  bucket: z.string().min(1)
});

export type BuildInvoiceProcessingSkeletonParams = z.infer<
  typeof BuildInvoiceProcessingSkeletonParamsSchema
>;

export function buildInvoiceProcessingSkeleton(
  input: unknown
): InvoiceProcessingSkeleton {
  const p = BuildInvoiceProcessingSkeletonParamsSchema.parse(input);
  const draft: InvoiceProcessingSkeleton = {
    PK: p.orgId,
    SK: p.sk,
    status: 'PROCESSING',
    processed_at: null,
    ai_analysis: {
      service_type: 'PENDING',
      value: 0,
      unit: '',
      status_triage: 'IN_QUEUE'
    },
    climatiq_result: {},
    extracted_data: {
      vendor: 'Extracting...',
      total_amount: 0,
      currency: '',
      billing_period: { start: null, end: null }
    },
    metadata: {
      s3_key: p.s3Key,
      bucket: p.bucket,
      status: 'UPLOADED',
      is_draft: true
    }
  };
  return InvoiceProcessingSkeletonSchema.parse(draft);
}
