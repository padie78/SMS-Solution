import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
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

    const messageBody = {
      bucket: params.bucket,
      key: params.key,
      orgId: params.orgId,
      sk: params.sk,
      timestamp: new Date().toISOString(),
      status: "PENDING_WORKER"
    };

    console.log(`[DISPATCHER] [${params.requestId}] Enqueuing to SQS. sk=${params.sk}`);
    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(messageBody)
      })
    );
  }
}

