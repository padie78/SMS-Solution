import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/** @type {DynamoDBDocumentClient | null} */
let documentClientSingleton = null;

/**
 * DocumentClient singleton (marshall optimizado para Lambdas).
 * @param {import('@aws-sdk/client-dynamodb').DynamoDBClientConfig} [clientConfig]
 * @returns {DynamoDBDocumentClient}
 */
export const getDocumentClient = (clientConfig = {}) => {
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
export const resetDocumentClientSingleton = () => {
  documentClientSingleton = null;
};
