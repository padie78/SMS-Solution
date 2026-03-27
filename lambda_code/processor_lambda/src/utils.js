const { GetObjectCommand } = require("@aws-sdk/client-s3");

/**
 * Limpia el ruido típico de OCR de Textract
 */
function limpiarTexto(texto) {
    if (!texto) return "";
    return texto.replace(/\s+/g, ' ').trim();
}

/**
 * Validación básica para asegurar que Climatiq tenga lo mínimo necesario
 */
function validarCampos(datos) {
    return !!(datos && datos.consumption_value && datos.consumption_unit && datos.service_type);
}

/**
 * Helper para descargar desde S3. 
 * Se inyecta el s3Client desde el index.js para evitar errores de scope.
 */
async function downloadFromS3(s3Client, bucket, key) {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * Transforma todas las piezas (IA, OCR, Climatiq) en un registro único y coherente.
 */
function buildGoldenRecord(orgId, fileId, key, filename, fileHash, ai, climatiq) {
    const now = new Date().toISOString();
    const [datePart] = now.split('T');
    
    // Extraemos año y mes para las estadísticas
    const year = datePart.split('-')[0];
    const month = datePart.split('-')[1];

    // Sanitización de valores numéricos para DynamoDB
    const co2e = Number(climatiq.co2e) || 0;
    const amount = Number(ai.extracted_data?.total_amount) || 0;
    const serviceType = ai.ai_analysis?.service_type || "Unknown";

    return {
        // Referencias para la lógica de TransactWrite en db.js
        internal_refs: {
            orgId,
            year,
            month,
            co2e,
            totalAmount: amount,
            serviceType: serviceType
        },
        // El registro completo de auditoría (INV#...)
        full_record: {
            PK: `ORG#${orgId}`,
            SK: `INV#${datePart}#${fileId}`,
            metadata: { 
                filename, 
                s3_key: key, 
                file_hash: fileHash, 
                upload_date: now, 
                status: "PROCESSED",
                source: "SYSTEM_PIPELINE"
            },
            extracted_data: { 
                ...ai.extracted_data, 
                total_amount: amount,
                currency: ai.extracted_data?.currency || "USD"
            },
            ai_analysis: { 
                ...ai.ai_analysis, 
                confidence_score: Number(ai.ai_analysis?.confidence_score) || 0,
                requires_review: (ai.ai_analysis?.confidence_score || 0) < 0.85
            },
            climatiq_result: { 
                ...climatiq, 
                co2e, 
                timestamp: now,
                co2e_unit: "kg" 
            },
            analytics_dimensions: {
                period_year: parseInt(year),
                period_month: parseInt(month),
                carbon_intensity: amount > 0 ? parseFloat((co2e / amount).toFixed(5)) : 0,
                sector: "CONSTRUCTION" // Podría venir dinámico desde la Org
            }
        }
    };
}

module.exports = { 
    limpiarTexto, 
    validarCampos, 
    downloadFromS3, 
    buildGoldenRecord 
};