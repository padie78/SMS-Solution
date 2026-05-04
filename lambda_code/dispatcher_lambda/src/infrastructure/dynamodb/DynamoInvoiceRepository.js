import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { buildInvoiceProcessingSkeleton } from "@sms/common";
import { Logger } from "@sms/shared";
import { ddb, TABLE_NAME } from "../../services/data/client.js";

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
    const invoiceItem = buildInvoiceProcessingSkeleton({
      orgId: params.orgId,
      sk: params.sk,
      s3Key: params.key,
      bucket: params.bucket
    });

    Logger.info("DynamoDB Put invoice skeleton", {
      requestId: params.requestId,
      sk: params.sk,
      orgId: params.orgId,
      tableName: this.tableName,
      source: "dispatcher_lambda"
    });

    await this.ddb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: invoiceItem
      })
    );

    Logger.info("Invoice skeleton persisted", {
      requestId: params.requestId,
      sk: params.sk,
      source: "dispatcher_lambda"
    });
  }
}

