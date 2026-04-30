import { SqsInvoiceQueue } from "../infrastructure/aws/SqsInvoiceQueue.js";

const queueUrl =
  process.env.QUEUE_URL ||
  "https://sqs.eu-central-1.amazonaws.com/473959757331/sms-platform-invoice-queue-dev";

const queue = new SqsInvoiceQueue({ queueUrl });

export const dispatchInvoice = async (bucket, key, orgId, sk) => {
    await queue.enqueueInvoice({ bucket, key, orgId, sk, requestId: "legacy" });
    return { success: true, message: "Enqueued" };
};