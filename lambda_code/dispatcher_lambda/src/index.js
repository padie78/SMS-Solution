import { buildS3PutObjectHandler } from "./handlers/s3PutObjectHandler.js";
import { DispatchInvoiceFromS3PutEvent } from "./application/usecases/DispatchInvoiceFromS3PutEvent.js";
import { S3OrgResolverAws } from "./infrastructure/aws/S3OrgResolverAws.js";
import { DynamoInvoiceRepository } from "./infrastructure/dynamodb/DynamoInvoiceRepository.js";
import { SqsInvoiceQueue } from "./infrastructure/aws/SqsInvoiceQueue.js";

const queueUrl =
  process.env.QUEUE_URL ||
  "https://sqs.eu-central-1.amazonaws.com/473959757331/sms-platform-invoice-queue-dev";

const orgResolver = new S3OrgResolverAws();
const invoiceRepository = new DynamoInvoiceRepository();
const invoiceQueue = new SqsInvoiceQueue({ queueUrl });

const useCase = new DispatchInvoiceFromS3PutEvent({
  orgResolver,
  invoiceRepository,
  invoiceQueue
});

export const handler = buildS3PutObjectHandler({ useCase });