/**
 * Plantilla de referencia: cablear `@sms/application` + `@sms/infrastructure` en NestJS (Lambda API).
 * No importar este archivo desde Angular (evitar `infrastructure` en el browser).
 *
 * `RecordInvoiceIaExtractionUseCase` depende de `InvoiceExtractionWriterPort` (barrel `@sms/application`).
 * `DynamoInvoiceRepository` implementa ese contrato estructuralmente (además de `IInvoiceRepository` en dominio).
 *
 * @example
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { InjectionToken } from '@nestjs/common';
 * import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
 * import { RecordInvoiceIaExtractionUseCase } from '@sms/application';
 * import { DynamoInvoiceRepository } from '@sms/infrastructure';
 * import type { InvoiceExtractionWriterPort } from '@sms/application';
 *
 * export const INVOICE_WRITER = new InjectionToken<InvoiceExtractionWriterPort>('INVOICE_WRITER');
 *
 * @Module({
 *   providers: [
 *     {
 *       provide: INVOICE_WRITER,
 *       useFactory: (doc: DynamoDBDocumentClient) =>
 *         new DynamoInvoiceRepository(doc, process.env.SINGLE_TABLE_NAME ?? ''),
 *       inject: [DynamoDBDocumentClient]
 *     },
 *     {
 *       provide: RecordInvoiceIaExtractionUseCase,
 *       useFactory: (writer: InvoiceExtractionWriterPort) =>
 *         new RecordInvoiceIaExtractionUseCase(writer),
 *       inject: [INVOICE_WRITER]
 *     }
 *   ],
 *   exports: [RecordInvoiceIaExtractionUseCase]
 * })
 * export class InvoiceIaAppModule {}
 * ```
 *
 * Para un caso de uso que inyecte el contrato completo de dominio:
 * `{ provide: 'IInvoiceRepository', useFactory: (doc) => new DynamoInvoiceRepository(doc, table), inject: [...] }`
 * (Nest no puede usar `IInvoiceRepository` como token en runtime: usar `InjectionToken` o string symbol estable).
 */
export {};
