import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";

const client = new TextractClient({ 
    region: process.env.AWS_REGION || "eu-central-1" 
});

/**
 * Extrae texto bruto (OCR) de un documento en S3.
 * Ideal para procesar luego con LLMs (Bedrock).
 */
export const getTextFromS3 = async (bucket, key) => {
    console.log(`   🔍 [TEXTRACT] | Iniciando OCR: s3://${bucket}/${key}`);

    const params = {
        Document: {
            S3Object: {
                Bucket: bucket,
                Name: key
            }
        }
    };

    try {
        const command = new DetectDocumentTextCommand(params);
        const response = await client.send(command);

        // Extraemos solo las líneas detectadas
        const rawText = response.Blocks
            .filter(block => block.BlockType === "LINE")
            .map(block => block.Text)
            .join("\n");

        if (!rawText) {
            throw new Error("Textract devolvió un resultado vacío.");
        }

        console.log(`   ✅ [TEXTRACT] | OCR Exitoso. Longitud: ${rawText.length} caracteres.`);
        return rawText;

    } catch (error) {
        console.error(`   ❌ [TEXTRACT_ERROR] | Error en S3: ${key}:`, error.message);
        throw error;
    }
};