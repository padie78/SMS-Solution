/** AWS SDK v3, DynamoDB DocumentClient y repositorios SMS (sin reglas de negocio). */

export { getDocumentClient, resetDocumentClientSingleton } from './dynamodb/index.js';

export { BaseRepository, type QueryByPartitionKeyOptions } from './repository/index.js';

export { InvoiceRepository, type InvoiceRepositorySaveKeys } from './invoice/index.js';
