import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../../services/data/client.js";
import { buildInvoiceSkeleton } from "../../utils/dbSchema.js";

export class DynamoInvoiceRepository {
  /**
   * @param {{ ddbClient?: typeof ddb, tableName?: string }} deps
   */
  constructor(deps = {}) {
    this.ddb = deps.ddbClient || ddb;
    this.tableName = deps.tableName || TABLE_NAME;
  }

  /**
   * @param {{ orgId: string, sk: string, bucket: string, key: string, requestId: string }} params
   */
  async putInvoiceSkeleton(params) {
    const invoiceItem = buildInvoiceSkeleton(params.orgId, params.sk, params.key, params.bucket);

    console.log(
      `[DB_OPERATION] [${params.requestId}] [${params.sk}] Attempting write to ${this.tableName} for Org: ${params.orgId}`
    );

    await this.ddb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: invoiceItem
      })
    );

    console.log(`[DB_SUCCESS] [${params.requestId}] [${params.sk}] Skeleton successfully persisted.`);
  }
}

