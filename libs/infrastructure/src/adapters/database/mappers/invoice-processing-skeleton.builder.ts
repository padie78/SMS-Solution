import { buildInvoiceProcessingSkeleton } from '@sms/common';

export type BuildInvoiceDispatchSkeletonParams = {
  readonly orgId: string;
  readonly sk: string;
  readonly s3Key: string;
  readonly bucket: string;
  readonly ingestionSource?: string;
  readonly technicalHash?: string;
  readonly uploadDate?: string;
};

/**
 * Construye el ítem DynamoDB draft (`PROCESSING`) tras S3 PUT.
 * Capa de persistencia: delega validación de shape al contrato compartido hasta migrar el esquema aquí.
 */
export function buildInvoiceDispatchSkeletonItem(params: BuildInvoiceDispatchSkeletonParams): Record<string, unknown> {
  return buildInvoiceProcessingSkeleton(params) as Record<string, unknown>;
}
