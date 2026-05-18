import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { parseInvoiceDispatchQueueMessage } from '@sms/common';
import type { InvoiceDispatchQueuePort } from '@sms/application';

import { InfrastructureConfigError } from '../../shared/infrastructure-config.error.js';

export type SqsInvoiceDispatchQueueAdapterOptions = {
  readonly queueUrl: string | undefined;
  readonly sqs?: SQSClient;
};

/**
 * Adaptador SQS: construye el payload técnico y envía el mensaje al worker.
 */
export class SqsInvoiceDispatchQueueAdapter implements InvoiceDispatchQueuePort {
  private readonly queueUrl: string | undefined;
  private readonly sqs: SQSClient;

  constructor(options: SqsInvoiceDispatchQueueAdapterOptions) {
    this.queueUrl = options.queueUrl;
    this.sqs = options.sqs ?? new SQSClient({});
  }

  async enqueueInvoice(params: {
    bucket: string;
    key: string;
    orgId: string;
    sk: string;
    requestId: string;
  }): Promise<void> {
    if (!this.queueUrl) {
      throw new InfrastructureConfigError(
        `SQS_QUEUE_URL env var not set. requestId=${params.requestId}`
      );
    }

    const draft = {
      bucket: params.bucket,
      key: params.key,
      orgId: params.orgId,
      sk: params.sk,
      timestamp: new Date().toISOString(),
      status: 'PENDING_WORKER' as const
    };

    const messageBody = parseInvoiceDispatchQueueMessage(draft);

    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(messageBody)
      })
    );
  }
}
