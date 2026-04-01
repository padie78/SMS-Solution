import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";

// Configuración del cliente. Usamos la región de tus buckets de S3.
const client = new TextractClient({ 
    region: process.env.AWS_REGION || "eu-central-1" 
});

/**
 * Extrae texto bruto (OCR) de un documento en S3.
 * Sin Queries, sin errores de parámetros.
 */
export const extractText = async (bucket, key) => {
    console.log(`   [TEXTRACT_START]: Modo OCR Puro | s3://${bucket}/${key}`);

    const params = {
        Document: {
            S3Object: {
                Bucket: bucket,
                Name: key
            }
        }
    };

    try {
        // Usamos DetectDocumentTextCommand para OCR base (sin Features/Queries)
        const command = new DetectDocumentTextCommand(params);
        const response = await client.send(command);

        // Procesamos los bloques para obtener solo las líneas de texto
        const rawText = response.Blocks
            .filter(block => block.BlockType === "LINE")
            .map(block => block.Text)
            .join("\n");

        if (!rawText || rawText.length === 0) {
            throw new Error("Textract no pudo extraer texto del documento.");
        }

        console.log(`   [TEXTRACT_END]: OCR completado. Caracteres: ${rawText.length}`);

        return {
            rawText,
            queryHints: {}, // Objeto vacío para mantener compatibilidad con el resto del flujo
            category: "OTHERS"
        };

    } catch (error) {
        console.error(`   ❌ [TEXTRACT_ERROR] en s3://${bucket}/${key}:`, error.message);
        throw error;
    }
};

export default { extractText };