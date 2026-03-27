const crypto = require("crypto");
const { S3Client } = require("@aws-sdk/client-s3");

// Importación de módulos de infraestructura y lógica
const { extraerFactura } = require("./textract");
const { entenderConIA } = require("./bedrock");
const { calcularEnClimatiq } = require("./external_api");
const { saveInvoiceWithStats } = require("./db");
const { downloadFromS3, buildGoldenRecord } = require("./utils");

// Inicialización de cliente (fuera del handler para reutilizar ejecución en Lambda)
const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

exports.handler = async (event) => {
    const results = [];

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        
        try {
            // 1. Extraer Metadatos del Path (Multi-tenant: uploads/{orgId}/{filename})
            const parts = key.split('/');
            const orgId = parts[1] || 'UNKNOWN_ORG';
            const filename = parts.pop();
            const fileId = filename.split('.')[0];

            console.log(`[START] Procesando ${filename} para Org: ${orgId}`);

            // 2. Procesamiento de Archivo y OCR
            // IMPORTANTE: Pasamos s3Client como primer argumento
            const fileBuffer = await downloadFromS3(s3Client, bucket, key);
            
            const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const rawOcr = await extraerFactura(bucket, key);
            
            // 3. Inteligencia y Cálculos (Bedrock + Climatiq)
            const ai = await entenderConIA(rawOcr.summary, rawOcr.items);
            const climatiq = await calcularEnClimatiq(ai.ai_analysis) || {};

            // 4. Mapeo del Golden Record (Estructura para Single Table Design)
            const recordToSave = buildGoldenRecord(orgId, fileId, key, filename, fileHash, ai, climatiq);

            // 5. Persistencia Atómica (Transacción: Factura + Actualización de STATS)
            await saveInvoiceWithStats(recordToSave);

            console.log(`[SUCCESS] Factura ${fileId} procesada y estadísticas actualizadas.`);
            results.push({ key, status: 'success' });

        } catch (err) {
            console.error(`[ERROR] Falló el procesamiento de ${key}: ${err.message}`);
            results.push({ key, status: 'error', message: err.message });
        }
    }
    return results;
};