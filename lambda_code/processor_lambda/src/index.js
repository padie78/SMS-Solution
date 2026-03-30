const crypto = require("crypto");
const { S3Client } = require("@aws-sdk/client-s3");
const { extraerFactura } = require("./textract");
const { calculateInClimatiq } = require("./external_api");
const { saveInvoiceWithStats } = require("./db");
const { downloadFromS3, buildGoldenRecord } = require("./utils");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

exports.handler = async (event, context) => {
    const results = [];
    const requestId = context.awsRequestId;

    console.log(`=== [START_BATCH] Req: ${requestId} | Records: ${event.Records.length} ===`);

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        
        try {
            const parts = key.split('/');
            const orgId = parts[1] || 'UNKNOWN_ORG';
            const filename = parts.pop();
            const fileId = filename.split('.')[0];

            console.log(`\n--- [STEP 1: METADATA] ---`);
            console.log(`File: ${filename} | Org: ${orgId} | Key: ${key}`);

            // 2. OCR - Textract
            const rawOcr = await extraerFactura(bucket, key);
            console.log(`\n--- [STEP 2: OCR_RESULT] ---`);
            console.log(JSON.stringify(rawOcr, null, 2));
            
            // 3. Integridad (Hash)
            const fileBuffer = await downloadFromS3(s3Client, bucket, key);
            const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            console.log(`\n--- [STEP 3: FILE_INTEGRITY] ---`);
            console.log(`SHA256: ${fileHash}`);

            // 4. IA + CLIMATIQ
            const climatiqResult = await calculateInClimatiq(rawOcr.summary, rawOcr.query_hints);
            console.log(`\n--- [STEP 4: CLIMATIQ_CALCULATION] ---`);
            console.log(JSON.stringify(climatiqResult, null, 2));

            // 5. Construcción del "Golden Record"
            const recordToSave = buildGoldenRecord(
                orgId, 
                fileId, 
                key, 
                filename, 
                fileHash, 
                climatiqResult.invoice_metadata || {}, 
                climatiqResult               
            );
            console.log(`\n--- [STEP 5: GOLDEN_RECORD_READY] ---`);
            console.log(JSON.stringify(recordToSave, null, 2));

            // 6. Lógica Defensiva y Status
            if (!climatiqResult || climatiqResult.total_co2e === 0) {
                console.warn(`[!] Status: PENDING_REVIEW | Reason: No carbon data.`);
                recordToSave.status = "PENDING_REVIEW";
                recordToSave.error_log = "IA could not extract emission lines or calculation resulted in 0.";
            } else {
                recordToSave.status = "PROCESSED";
                const unit = (climatiqResult.items && climatiqResult.items.length > 0) 
                             ? climatiqResult.items[0].unit 
                             : 'kg';
                console.log(`✅ [STEP 6: FINAL_STATUS] PROCESSED | Total: ${climatiqResult.total_co2e.toFixed(5)} ${unit}`);
            }

            // 7. Persistencia
            console.log(`\n--- [STEP 7: DATABASE_PERSISTENCE] ---`);
            const dbStatus = await saveInvoiceWithStats(recordToSave);
            console.log(`DB Response: ${JSON.stringify(dbStatus)}`);
            
            results.push({ 
                key, 
                status: 'success', 
                co2e: climatiqResult.total_co2e 
            });

        } catch (err) {
            console.error(`\n❌ [FATAL_ERROR] ${key}`);
            console.error(`Stack: ${err.stack}`);
            results.push({ key, status: 'error', message: err.message });
        }
    }
    
    console.log(`\n=== [END_BATCH] Req: ${requestId} ===`);
    return results;
};