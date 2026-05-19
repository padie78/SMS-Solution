import { PutCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { InvoiceDispatchSkeletonWriterPort } from '@sms/application';

import { buildInvoiceDispatchSkeletonItem } from '../../../database/mappers/invoice-processing-skeleton.builder.js';

/**
 * Adaptador DynamoDB: persiste el skeleton inicial de factura (`PROCESSING`).
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
    const invoiceItem = buildInvoiceDispatchSkeletonItem({
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
