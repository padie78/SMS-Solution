import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * AWS Region configuration
 */
const region = process.env.AWS_REGION || "eu-central-1";

/**
 * Base DynamoDB Client
 */
const client = new DynamoDBClient({ region });

/**
 * Document Client configurations for seamless JavaScript object mapping
 */
const marshallOptions = {
    convertEmptyValues: true,       // Handles empty strings gracefully
    removeUndefinedValues: true,    // Prevents errors by not persisting undefined fields
    convertClassInstanceToMap: true // Support for class-based models
};

const unmarshallOptions = {
    wrapNumbers: false,             // Returns standard JS numbers
};

console.log(`[INFRA] [DATABASE] Initializing DynamoDB DocumentClient in region: ${region}`);

/**
 * Exportable Document Client Instance
 */
export const ddb = DynamoDBDocumentClient.from(client, {
    marshallOptions,
    unmarshallOptions,
});

/**
 * Centralized Table Name from Environment
 */
export const TABLE_NAME = process.env.DYNAMODB_TABLE || "sms-platform-dev-emissions";