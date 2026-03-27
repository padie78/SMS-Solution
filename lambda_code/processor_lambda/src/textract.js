const { TextractClient, AnalyzeDocumentCommand } = require("@aws-sdk/client-textract");

// Reutilización de cliente para optimizar el rendimiento en AWS Lambda
const textractClient = new TextractClient({ region: process.env.AWS_REGION || "eu-central-1" });

/**
 * Realiza el OCR de la factura usando AnalyzeDocument con Queries en Inglés.
 * Incorpora campos de auditoría para un SaaS de Sustentabilidad profesional.
 */
exports.extraerFactura = async (bucket, key) => {
    console.log(`[TEXTRACT] Iniciando análisis profundo en s3://${bucket}/${key}`);
    
    const params = {
        Document: { S3Object: { Bucket: bucket, Name: key } },
        // QUERIES: Para datos específicos con alta precisión.
        // FORMS: Para capturar pares clave-valor que Textract detecta automáticamente.
        FeatureTypes: ["QUERIES", "FORMS"], 
        QueriesConfig: {
            Queries: [
                // Identificación y Finanzas
                { Text: "What is the vendor or company name?", Alias: "VENDOR" },
                { Text: "What is the total amount to pay?", Alias: "TOTAL_AMOUNT" },
                { Text: "What is the currency (code or symbol)?", Alias: "CURRENCY" },
                { Text: "What is the invoice or document number?", Alias: "INVOICE_NUMBER" },
                
                // Temporalidad (Crítico para reportes de GEI mensuales)
                { Text: "What is the invoice date?", Alias: "INVOICE_DATE" },
                { Text: "What is the service period start date?", Alias: "PERIOD_START" },
                { Text: "What is the service period end date?", Alias: "PERIOD_END" },
                
                // Consumo Específico (Clave para Climatiq)
                { Text: "What is the total consumption value and unit (e.g. 500 kWh, 15 m3)?", Alias: "CONSUMPTION" },
                
                // Auditoría y Localización (Para multi-site management)
                { Text: "What is the service address or installation site?", Alias: "SITE_LOCATION" },
                { Text: "What is the meter number or account identifier?", Alias: "ACCOUNT_ID" }
            ]
        }
    };

    try {
        const command = new AnalyzeDocumentCommand(params);
        const response = await textractClient.send(command);

        // 1. Extraemos el texto completo para el resumen de Bedrock
        const fullText = response.Blocks
            .filter(b => b.BlockType === "LINE")
            .map(b => b.Text)
            .join(" ");

        // 2. Mapeo de respuestas de Queries
        const queryResults = {};
        const queryBlocks = response.Blocks.filter(b => b.BlockType === "QUERY");
        
        queryBlocks.forEach(q => {
            const relationship = q.Relationships?.find(r => r.Type === "ANSWER");
            if (relationship) {
                // Buscamos el bloque de respuesta vinculado
                const answerBlock = response.Blocks.find(b => b.Id === relationship.Ids[0]);
                if (answerBlock && answerBlock.Text) {
                    queryResults[q.Query.Alias] = answerBlock.Text.trim();
                }
            } else {
                queryResults[q.Query.Alias] = null; // Mantenemos la llave para consistencia
            }
        });

        // 3. (Opcional) Metadata adicional para debugging o auditoría
        const metadata = {
            pages: response.DocumentMetadata.Pages,
            model_version: "Textract_AnalyzeDoc_v2024"
        };

        return {
            summary: fullText.trim(),
            query_hints: queryResults, // Este es el "oro" para Bedrock
            metadata: metadata,
            raw_blocks: response.Blocks // Por si necesitas procesar tablas después
        };

    } catch (error) {
        console.error("[TEXTRACT_CRITICAL_ERROR]:", error.message);
        throw new Error(`Textract failed to process document: ${error.message}`);
    }
};