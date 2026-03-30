const crypto = require("crypto");
const { S3Client } = require("@aws-sdk/client-s3");
const { extraerFactura } = require("./textract");
const { entenderConIA } = require("./bedrock");
const { calculateInClimatiq } = require("./external_api");
const { saveInvoiceWithStats } = require("./db");
const { downloadFromS3, buildGoldenRecord } = require("./utils");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

exports.handler = async (event, context) => {
    const results = [];
    const requestId = context.awsRequestId;

    console.log(`=== [BATCH_START] Req: ${requestId} | Records: ${event.Records.length} ===`);

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        
        try {
            console.log(`>>> [PROCESSING_FILE]: s3://${bucket}/${key}`);
            
            const parts = key.split('/');
            const orgId = parts[1] || 'UNKNOWN_ORG';
            const filename = parts.pop();
            const fileId = filename.split('.')[0];

            // 1. OCR - Entrada y Salida
            console.log(`   [STEP_1_START]: Textract OCR for ${key}...`);
            const rawOcr = await extraerFactura(bucket, key);
            console.log(`   [STEP_1_END]: OCR Success. Summary length: ${rawOcr.summary?.length || 0} chars.`);

            // 2. Hash & Metadata - Entrada y Salida
            console.log(`   [STEP_2_START]: Downloading for Hash calculation...`);
            const fileBuffer = await downloadFromS3(s3Client, bucket, key);
            const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            console.log(`   [STEP_2_END]: Hash generated: ${fileHash.substring(0, 8)}...`);

            // 3. IA - Entrada y Salida
            console.log(`   [STEP_3_START]: Bedrock Semantic Analysis...`);
            const aiAnalysis = await entenderConIA(rawOcr.summary, rawOcr.query_hints);
            console.log(`   [STEP_3_END]: IA Analysis complete. Category: ${aiAnalysis.category || 'N/A'}`);

            // 4. Climatiq - Entrada y Salida
            console.log(`   [STEP_4_START]: Climatiq Carbon Calculation...`);
            const climatiqResult = await calculateInClimatiq(rawOcr.summary, rawOcr.query_hints);
            if (climatiqResult) {
                console.log(`   [STEP_4_END]: Calculation Success: ${climatiqResult.co2e} ${climatiqResult.unit}`);
            } else {
                console.warn(`   [STEP_4_END]: Calculation returned NULL (Handled Error)`);
            }

            // 5. Persistencia
            console.log(`   [STEP_5_START]: Persisting to Database (Org: ${orgId})...`);
            const recordToSave = buildGoldenRecord(orgId, fileId, key, filename, fileHash, aiAnalysis, climatiqResult || {});

            if (!climatiqResult) {
                console.warn(`      [!] Flagging record for manual review: Calculation failed.`);
                recordToSave.metadata = { ...recordToSave.metadata, status: "FAILED_CALCULATION" };
                recordToSave.ai_analysis = { ...recordToSave.ai_analysis, requires_review: true };
            }

            await saveInvoiceWithStats(recordToSave);
            console.log(`   [STEP_5_END]: Database Save Success for ${fileId}`);
            
            console.log(`✅ [PROCESSED_OK]: ${key}`);
            results.push({ key, status: 'success' });

        } catch (err) {
            console.error(`❌ [STEP_FATAL_ERROR] at ${key}:`);
            console.error(`   Message: ${err.message}`);
            console.error(`   Stack: ${err.stack}`);
            results.push({ key, status: 'error', message: err.message });
        }
    }
    
    console.log(`=== [BATCH_COMPLETE] Req: ${requestId} | Success: ${results.filter(r => r.status === 'success').length} ===`);
    return results;
};