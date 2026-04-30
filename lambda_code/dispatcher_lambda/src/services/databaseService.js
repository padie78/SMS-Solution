import { DynamoInvoiceRepository } from "../infrastructure/dynamodb/DynamoInvoiceRepository.js";

const repo = new DynamoInvoiceRepository();

export const createInvoiceSkeleton = async (orgId, sk, s3Key, bucket) => {
    await repo.putInvoiceSkeleton({ orgId, sk, bucket, key: s3Key, requestId: "legacy" });
    return { PK: orgId, SK: sk };
};