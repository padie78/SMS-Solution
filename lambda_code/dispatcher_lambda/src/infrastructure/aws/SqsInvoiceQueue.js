import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { parseInvoiceDispatchQueueMessage } from "@sms/common";
import { Logger } from "@sms/shared";
import { ConfigError } from "../../domain/errors.js";

export class SqsInvoiceQueue {
  /**
   * @param {{ queueUrl: string | undefined, sqs?: SQSClient }} deps
   */
  constructor(deps) {
    this.queueUrl = deps.queueUrl;
    this.sqs = deps.sqs || new SQSClient({});
  }

  /**
   * @param {{ bucket: string, key: string, orgId: string, sk: string, requestId: string }} params
   */
  async enqueueInvoice(params) {
    if (!this.queueUrl) {
      throw new ConfigError(`QUEUE_URL env var not set. requestId=${params.requestId}`);
    }

    const draft = {
      bucket: params.bucket,
      key: params.key,
      orgId: params.orgId,
      sk: params.sk,
      timestamp: new Date().toISOString(),
      status: "PENDING_WORKER"
    };

    const messageBody = parseInvoiceDispatchQueueMessage(draft);

    Logger.info("Enqueue invoice to SQS", {
      requestId: params.requestId,
      sk: params.sk,
      source: "dispatcher_lambda"
    });

    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(messageBody)
      })
    );
  }
}

