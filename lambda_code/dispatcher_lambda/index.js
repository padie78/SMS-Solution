import { extractInvoiceMetadataFromS3Key } from '@sms/domain';
import { DispatchInvoiceFromS3PutUseCase } from '@sms/application';
import {
  createDynamoDocumentClient,
  DynamoInvoiceDispatchSkeletonAdapter,
  S3InvoiceDispatchOrgResolverAdapter,
  SqsInvoiceDispatchQueueAdapter
} from '@sms/infrastructure';

// --- COMPOSITION ROOT / INYECCIÓN DE DEPENDENCIAS ---
const queueUrl = process.env.SQS_QUEUE_URL;
if (!queueUrl) {
  throw new Error('SQS_QUEUE_URL environment variable is not defined');
}

const tableName = process.env.DYNAMO_TABLE ?? process.env.DYNAMODB_TABLE;
if (!tableName) {
  throw new Error('DYNAMO_TABLE environment variable is not defined');
}

const doc = createDynamoDocumentClient();
const orgResolver = new S3InvoiceDispatchOrgResolverAdapter();
const skeletonWriter = new DynamoInvoiceDispatchSkeletonAdapter(doc, tableName);
const invoiceQueue = new SqsInvoiceDispatchQueueAdapter({ queueUrl });

const dispatchInvoiceFromS3Put = new DispatchInvoiceFromS3PutUseCase({
  orgResolver,
  skeletonWriter,
  invoiceQueue
});

// --- HANDLER DE AWS (TRADUCTOR PURO) ---
export const handler = async (event, context) => {
  try {
    const record = event?.Records?.[0];
    const bucket = record?.s3?.bucket?.name;
    const rawKey = record?.s3?.object?.key;
    const requestId = context?.awsRequestId ?? 'internal';

    if (!bucket || !rawKey) {
      throw new Error('Invalid S3 event: missing bucket or object key');
    }

    const uploadKey = extractInvoiceMetadataFromS3Key(rawKey);

    return await dispatchInvoiceFromS3Put.execute({
      requestId,
      bucket,
      uploadKey
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error');
  }
};
