import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { RecordInvoiceIaExtractionUseCase } from '@sms/application';

import { DynamoInvoiceRepository } from '../adapters/database/repositories/dynamo-invoice.repository.js';

/** Composition root: caso de uso + repositorio Dynamo para extracción IA. */
export function createRecordInvoiceIaExtractionUseCase(
  doc: DynamoDBDocumentClient,
  tableName: string
): RecordInvoiceIaExtractionUseCase {
  return new RecordInvoiceIaExtractionUseCase(new DynamoInvoiceRepository(doc, tableName));
}
