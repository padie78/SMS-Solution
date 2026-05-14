import { z } from 'zod';
import { InvoiceIaTechnicalExtractionSchema } from './invoice-ia-technical-extraction.dto.js';
export const InvoiceDTOSchema = z.object({
    // Identificadores Jerárquicos
    pk: z.string().startsWith('TENANT#'), // TENANT#54354#ORG#f3d4...
    sk: z.string().startsWith('INV#'), // INV#A99887766#GG202605882
    // Análisis de IA (ai_analysis)
    aiAnalysis: z.object({
        activityId: z.string(),
        calculationMethod: z.string(),
        confidenceScore: z.number(),
        requiresReview: z.boolean(),
        serviceType: z.string(), // GAS, ELECTRICITY, etc.
        unit: z.string(),
        value: z.number(),
        year: z.number()
    }),
    // Dimensiones para Analytics (analytics_dimensions)
    analyticsDimensions: z.object({
        assetId: z.string(),
        branchId: z.string(),
        periodMonth: z.number(),
        periodYear: z.number(),
        sector: z.string()
    }),
    // Resultados de Huella de Carbono (climatiq_result)
    climatiqResult: z.object({
        co2e: z.number(),
        co2eUnit: z.string(),
        timestamp: z.string().datetime()
    }),
    // Datos extraídos del documento (extracted_data)
    extractedData: z.object({
        billingPeriod: z.object({
            start: z.string(), // ISO Date
            end: z.string() // ISO Date
        }),
        invoiceDate: z.string(),
        invoiceNumber: z.string(),
        totalAmount: z.number(),
        vendor: z.string(),
        vendorTaxId: z.string()
    }),
    // Metadatos y Auditoría (metadata)
    metadata: z.object({
        s3Key: z.string(),
        status: z.string(), // PROCESSED, PENDING, etc.
        technicalHash: z.string(),
        uploadDate: z.string().datetime(),
        thoughtProcess: z.object({
            detectedRawValues: z.array(z.string()),
            missingDataStrategy: z.string(),
            monetaryVsPhysicalCheck: z.string()
        })
    }),
    // Metadatos técnicos de extracción IA (persistidos dentro del business blob / ia_extracted_data)
    technicalExtraction: InvoiceIaTechnicalExtractionSchema.default(() => InvoiceIaTechnicalExtractionSchema.parse({})),
    // Otros campos raíz
    processedAt: z.string().datetime(),
    totalDaysProrated: z.number()
});
// Helper para parsear (recuerda que si vienes de DynamoDB, 
// necesitas un "unmarshaller" antes de pasarle el objeto a este DTO)
export const parseInvoiceDTO = (input) => InvoiceDTOSchema.parse(input);
export const safeParseInvoiceDTO = (input) => InvoiceDTOSchema.safeParse(input);
//# sourceMappingURL=invoice.dto.js.map