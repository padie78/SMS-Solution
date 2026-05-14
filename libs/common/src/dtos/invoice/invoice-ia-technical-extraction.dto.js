import { z } from 'zod';
/**
 * Metadatos técnicos de la extracción IA/OCR (50+ campos) persistidos en `ia_extracted_data`
 * vía mapper (snake_case en DynamoDB, camelCase en TS).
 */
export const InvoiceIaTechnicalExtractionSchema = z.object({
    extractionJobId: z.string().default(''),
    extractionRunId: z.string().default(''),
    pipelineVersion: z.string().default(''),
    modelProvider: z.string().default(''),
    modelName: z.string().default(''),
    modelVersion: z.string().default(''),
    promptTemplateId: z.string().default(''),
    tokenizerEncoding: z.string().default(''),
    inputTokenCount: z.number().int().nonnegative().default(0),
    outputTokenCount: z.number().int().nonnegative().default(0),
    totalLatencyMs: z.number().int().nonnegative().default(0),
    queueWaitMs: z.number().int().nonnegative().default(0),
    textractJobId: z.string().default(''),
    textractApiVersion: z.string().default(''),
    pageCount: z.number().int().nonnegative().default(0),
    ocrMeanConfidence: z.number().min(0).max(1).default(0),
    languageDetected: z.string().default(''),
    documentHashSha256: z.string().default(''),
    layoutEngineVersion: z.string().default(''),
    tableRegionCount: z.number().int().nonnegative().default(0),
    kvPairCount: z.number().int().nonnegative().default(0),
    boundingBoxVersion: z.string().default(''),
    dpiAssumed: z.number().int().positive().default(300),
    colorSpace: z.string().default(''),
    pdfProducer: z.string().default(''),
    pdfCreator: z.string().default(''),
    encryptionDetected: z.boolean().default(false),
    digitalSignatureDetected: z.boolean().default(false),
    currencyGuess: z.string().default(''),
    amountParseStrategy: z.string().default(''),
    dateParseStrategy: z.string().default(''),
    taxIdNormalizerVersion: z.string().default(''),
    vendorFuzzyMatchScore: z.number().min(0).max(1).default(0),
    climatiqRequestId: z.string().default(''),
    climatiqActivityIdResolved: z.string().default(''),
    gridRegionHint: z.string().default(''),
    carbonIntensitySource: z.string().default(''),
    dataQualityScore: z.number().min(0).max(1).default(0),
    anomalyFlags: z.array(z.string()).default([]),
    redactionApplied: z.boolean().default(false),
    piiFieldsStripped: z.array(z.string()).default([]),
    retryCount: z.number().int().nonnegative().default(0),
    lastErrorCode: z.string().default(''),
    lastErrorDetail: z.string().default(''),
    workerHostId: z.string().default(''),
    workerAz: z.string().default(''),
    ingestionCorrelationId: z.string().default(''),
    featureFlagsSnapshot: z.string().default(''),
    schemaVersion: z.string().default('invoice_ia_v1'),
    /** Dimensión de embedding / vector store (trazabilidad de RAG). */
    embeddingVectorDimension: z.number().int().nonnegative().default(0)
});
export const InvoiceIaExtractionSqsBodySchema = z.object({
    tenantId: z.string().min(1),
    orgId: z.string().min(1),
    invoiceId: z.string().min(1),
    pk: z.string().min(1),
    sk: z.string().min(1),
    extractionJobId: z.string().min(1).optional(),
    rawModelOutputUri: z.string().optional(),
    sourceBucket: z.string().optional(),
    sourceKey: z.string().optional()
});
export function parseInvoiceIaExtractionSqsBody(input) {
    return InvoiceIaExtractionSqsBodySchema.parse(input);
}
/**
 * Inicializa el bloque técnico de IA con defaults deterministas (worker SQS).
 */
export function buildInitialInvoiceIaTechnicalExtraction(params) {
    return InvoiceIaTechnicalExtractionSchema.parse({
        extractionJobId: params.extractionJobId ?? '',
        workerHostId: params.workerHostId ?? '',
        ingestionCorrelationId: params.ingestionCorrelationId ?? ''
    });
}
//# sourceMappingURL=invoice-ia-technical-extraction.dto.js.map