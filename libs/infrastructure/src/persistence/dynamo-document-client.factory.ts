import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export type DynamoDocumentClientOptions = {
  readonly region?: string;
};

/**
 * Document client compartido para repositorios y adaptadores DynamoDB.
 */
export function createDynamoDocumentClient(
  options: DynamoDocumentClientOptions = {}
): DynamoDBDocumentClient {
  const region = options.region ?? process.env.AWS_REGION ?? 'eu-central-1';
  const client = new DynamoDBClient({ region });

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true
    },
    unmarshallOptions: {
      wrapNumbers: false
    }
  });
}
