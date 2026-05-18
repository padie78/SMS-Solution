import { PutCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { buildInvoiceProcessingSkeleton } from '@sms/common';
import type { InvoiceDispatchSkeletonWriterPort } from '@sms/application';

/**
 * Persiste el skeleton inicial de factura en DynamoDB (estado `PROCESSING`).
 */
export class DynamoInvoiceDispatchSkeletonAdapter implements InvoiceDispatchSkeletonWriterPort {
  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly tableName: string
  ) {}

  async putInvoiceSkeleton(params: {
    orgId: string;
    sk: string;
    bucket: string;
    key: string;
    requestId: string;
  }): Promise<void> {
    const invoiceItem = buildInvoiceProcessingSkeleton({
      orgId: params.orgId,
      sk: params.sk,
      s3Key: params.key,
      bucket: params.bucket
    });

    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: invoiceItem
      })
    );
  }
}
