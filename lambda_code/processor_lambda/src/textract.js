const { TextractClient, AnalyzeExpenseCommand } = require("@aws-sdk/client-textract");

// Optimizamos el cliente fuera del handler
const textractClient = new TextractClient({ region: process.env.AWS_REGION || "eu-central-1" });

/**
 * Utiliza AnalyzeExpense para procesar facturas multipágina de forma síncrona.
 * Soporta hasta 30 páginas y detecta automáticamente campos financieros.
 */
exports.extraerFactura = async (bucket, key) => {
    console.log(`[TEXTRACT] Iniciando AnalyzeExpense en s3://${bucket}/${key}`);
    
    // Validación rápida de extensión (aunque S3 debería filtrarlo antes)
    const extension = key.split('.').pop().toLowerCase();
    
    const params = {
        Document: {
            S3Object: {
                Bucket: bucket,
                Name: key
            }
        }
    };

    try {
        const command = new AnalyzeExpenseCommand(params);
        const response = await textractClient.send(command);
        const pageCount = response.DocumentMetadata?.Pages || 1;
        console.log(`[TEXTRACT_SUCCESS] Documento de ${pageCount} páginas procesado.`);


        // 1. Extraemos TODO el texto de las 3 páginas para darle contexto a Bedrock
        const fullText = response.Blocks
            .filter(b => b.BlockType === "LINE")
            .map(b => b.Text)
            .join(" ");

        // 2. Mapeamos los campos normalizados que Textract encuentra por defecto
        // Nos enfocamos en el primer documento detectado (el PDF completo)
        const expenseDoc = response.ExpenseDocuments[0];
        const rawHints = {};

        if (expenseDoc && expenseDoc.SummaryFields) {
            expenseDoc.SummaryFields.forEach(field => {
                // Mapeamos el Label técnico a un nombre amigable
                const label = field.Type.Text || "UNKNOWN";
                const value = field.ValueDetection?.Text || null;
                rawHints[label] = value;
            });
        }

        // 3. Normalización de campos para mantener compatibilidad con tu esquema previo
        // AnalyzeExpense usa nombres de campos estándar de AWS
        const query_hints = {
            VENDOR: rawHints.VENDOR_NAME || rawHints.NAME,
            TOTAL_AMOUNT: rawHints.TOTAL || rawHints.AMOUNT_DUE,
            CURRENCY: rawHints.CURRENCY || null,
            INVOICE_DATE: rawHints.INVOICE_RECEIPT_DATE || rawHints.DATE,
            INVOICE_NUMBER: rawHints.INVOICE_RECEIPT_ID,
            // Estos campos suelen venir en 'LineItems' o como campos genéricos
            ACCOUNT_ID: rawHints.ACCOUNT_NUMBER || rawHints.CUSTOMER_NUMBER,
            ADDRESS: rawHints.VENDOR_ADDRESS || rawHints.RECEIVER_ADDRESS,
            // El consumo a veces viene en LineItems, pero Bedrock lo encontrará en el summary
            RAW_HINTS: rawHints // Mantenemos los crudos por si Bedrock quiere excavar más
        };

        return {
            summary: fullText.trim(),
            query_hints: query_hints,
            metadata: {
                pages: response.DocumentMetadata.Pages,
                method: "AnalyzeExpense",
                format: extension
            }
        };

    } catch (error) {
        console.error("[TEXTRACT_CRITICAL_ERROR]:", error.message);
        
        // Error específico cuando el PDF es ilegible o protegido
        if (error.name === "UnsupportedDocumentException") {
            throw new Error("The PDF is encrypted, corrupted, or not supported by AWS Textract.");
        }
        
        throw new Error(`Textract Failed: ${error.message}`);
    }
};