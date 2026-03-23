const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

// Importación de módulos
const { extraerFactura } = require("./textract");
const { entenderConIA } = require("./bedrock");
const { calcularEnClimatiq } = require("./external_api");

// 1. Configuración del Cliente con blindaje para valores undefined
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });

const dynamo = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
        removeUndefinedValues: true, // SOLUCIÓN: Elimina automáticamente atributos con valor 'undefined'
        convertEmptyValues: true     // Opcional: maneja strings vacíos
    },
});

const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

exports.handler = async (event) => {
    const results = [];

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        
        const parts = key.split('/');
        const orgId = parts[1] || 'UNKNOWN_ORG'; 
        const filename = parts[parts.length - 1];
        const fileId = filename.split('.')[0] || Date.now().toString();

        try {
            console.log(`[PIPELINE_START] Archivo: ${filename} | Org: ${orgId}`);

            // 1. Descarga y Hash del archivo
            const s3Response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
            const chunks = [];
            for await (const chunk of s3Response.Body) { chunks.push(chunk); }
            const fileBuffer = Buffer.concat(chunks);
            const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

            // 2. OCR - Textract
            const factura = await extraerFactura(bucket, key);
            
            // 3. IA - Bedrock
            const aiResponse = await entenderConIA(factura.summary, factura.items);
            const { extracted_data = {}, ai_analysis = {} } = aiResponse;

            // 4. Carbono - Climatiq
            const climatiq_result = await calcularEnClimatiq(ai_analysis) || {};

            const now = new Date().toISOString();
            const [datePart] = now.split('T');

            // 5. Métricas y Lógica
            const totalAmount = Number(extracted_data.total_amount) || 0;
            const co2Value = Number(climatiq_result.co2e) || 0;
            const carbonIntensity = totalAmount > 0 ? (co2Value / totalAmount).toFixed(5) : 0;

            const requiresReview = (ai_analysis.confidence_score || 0) < 0.85;

            // 6. Golden Record (Estructura Blindada)
            const itemToPersist = {
                PK: `ORG#${orgId}`,
                SK: `INV#${datePart}#${fileId}`,
                metadata: {
                    user_id: "system_lambda", 
                    upload_date: now,
                    filename: filename,
                    s3_key: key,
                    file_hash: fileHash,
                    status: "PROCESSED",
                    source_type: "S3_EVENT",
                    tags: parts.slice(2, -1) 
                },
                extracted_data: {
                    vendor: extracted_data.vendor || "Desconocido",
                    invoice_date: extracted_data.invoice_date || datePart,
                    total_amount: totalAmount,
                    currency: extracted_data.currency || "ARS",
                    due_date: extracted_data.due_date ?? null,
                    client_number: extracted_data.client_number || "N/A"
                },
                ai_analysis: {
                    model: "claude-3-5-haiku-20241022",
                    service_type: ai_analysis.service_type || "Unknown",
                    scope: ai_analysis.scope || 2,
                    suggested_query: ai_analysis.suggested_query ?? null, // Usamos null en vez de undefined
                    consumption_value: Number(ai_analysis.consumption_value) || 0,
                    consumption_unit: ai_analysis.consumption_unit || "unit",
                    unit_price: ai_analysis.unit_price || 0,
                    is_estimated_reading: !!ai_analysis.is_estimated_reading,
                    confidence_score: ai_analysis.confidence_score || 0,
                    requires_review: requiresReview,
                    insight_text: ai_analysis.insight_text ?? null
                },
                climatiq_result: {
                    calculation_id: climatiq_result.calculation_id ?? "N/A", // Evita el error de la imagen
                    co2e: co2Value,
                    co2e_unit: "kg",
                    intensity_factor: climatiq_result.intensity_factor ?? 0,
                    activity_id: climatiq_result.activity_id ?? "N/A",
                    audit_trail: climatiq_result.audit_trail ?? null,
                    timestamp: now
                },
                analytics_dimensions: {
                    region: "LATAM",
                    country: "AR",
                    city: extracted_data.city || "CABA",
                    sector: "CONSTRUCTION",
                    carbon_intensity_per_currency: parseFloat(carbonIntensity),
                    period_year: parseInt(datePart.split('-')[0]),
                    period_month: parseInt(datePart.split('-')[1])
                }
            };

            // 7. Persistencia
            console.log(`[STEP 4] Persistiendo en DynamoDB para factura ${fileId}...`);
            await dynamo.send(new PutCommand({
                TableName: process.env.DYNAMO_TABLE || "sms-platform-dev-emissions",
                Item: itemToPersist
            }));

            console.log(`[PIPELINE_SUCCESS] Factura ${fileId} guardada correctamente.`);
            results.push({ key, status: 'success' });

        } catch (err) {
            console.error(`[PIPELINE_ERROR] Error crítico procesando ${key}:`);
            console.error(`Mensaje: ${err.message}`);
            results.push({ key, status: 'error', message: err.message });
        }
    }
    return results;
};