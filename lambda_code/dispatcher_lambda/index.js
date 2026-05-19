import { extractInvoiceMetadataFromS3Key } from '@sms/domain';
import { DispatchInvoiceFromS3PutMapper } from '@sms/application';
import { createDynamoDocumentClient, createDispatchInvoiceFromS3PutUseCase } from '@sms/infrastructure';

// --- COMPOSITION ROOT (config/) ---
const queueUrl = process.env.SQS_QUEUE_URL;
if (!queueUrl) {
  throw new Error('SQS_QUEUE_URL environment variable is not defined');
}

const tableName = process.env.DYNAMO_TABLE ?? process.env.DYNAMODB_TABLE;
if (!tableName) {
  throw new Error('DYNAMO_TABLE environment variable is not defined');
}

const doc = createDynamoDocumentClient();
const dispatchInvoiceFromS3Put = createDispatchInvoiceFromS3PutUseCase({
  doc,
  tableName,
  queueUrl
});

// --- HANDLER (traductor AWS → caso de uso) ---
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

    const input = DispatchInvoiceFromS3PutMapper.toInputDto(
      { requestId, bucket, rawKey },
      DispatchInvoiceFromS3PutMapper.decodedUploadKeyFromDomain(uploadKey)
    );

    const result = await dispatchInvoiceFromS3Put.execute(input);

    if (!result.ok) {
      throw new Error(result.error);
    }

    return result.value;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unknown error');
  }
};
