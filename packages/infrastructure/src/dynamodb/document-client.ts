import type { DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let documentClientSingleton: DynamoDBDocumentClient | null = null;

/**
 * DocumentClient singleton (marshall optimizado para Lambdas).
 */
export const getDocumentClient = (clientConfig: DynamoDBClientConfig = {}): DynamoDBDocumentClient => {
  if (!documentClientSingleton) {
    const lowLevel = new DynamoDBClient(clientConfig);
    documentClientSingleton = DynamoDBDocumentClient.from(lowLevel, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true
      },
      unmarshallOptions: {
        wrapNumbers: false
      }
    });
  }
  return documentClientSingleton;
};

/** Solo tests o reseed de cliente entre invocaciones aisladas. */
export const resetDocumentClientSingleton = (): void => {
  documentClientSingleton = null;
};
