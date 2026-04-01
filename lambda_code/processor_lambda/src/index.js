// 1. Importaciones con sintaxis ESM y extensiones .js obligatorias
import textract from "./services/textract.js";
import classifier from "./services/classifier.js";
import bedrock from "./services/bedrock.js";
import climatiq from "./services/climatiq.js";
import mapper from "./utils/mapper.js";
import db from "./services/db.js";

// 2. Exportación nombrada para el handler de Lambda
export const handler = async (event, context) => { // Añadido 'context' como segundo parámetro
    const startTime = Date.now();
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    // ID de correlación: context.awsRequestId ya viene definido por AWS Lambda
    const requestId = context.awsRequestId || Math.random().toString(36).substring(7);

    console.log(`🚀 [PIPELINE_START] [ID:${requestId}]: Iniciando proceso para s3://${bucket}/${key}`);

    try {
        // --- FASE 1: CLASIFICACIÓN ---
        console.log(`   [1/6] [CLASSIFY_START]: Extrayendo texto base para identificación...`);
        const initialOcr = await textract.extractText(bucket, key, "OTHERS");
        console.log(`🔍 [INITIAL_OCR] | Cat: OTHERS | Hits: ${Object.values(initialOcr.queryHints || {}).filter(v => v !== "NOT_FOUND" && v !== null).length}/${Object.keys(initialOcr.queryHints || {}).length} | Vendor: ${initialOcr.queryHints?.VENDOR_NAME || 'N/A'} | Total: ${initialOcr.queryHints?.TOTAL_AMOUNT || 'N/A'}`);
        
        const category = await classifier.identifyCategory(initialOcr.rawText);
        console.log(`   [1/6] [CLASSIFY_END]: Categoría resuelta -> ${category}`);


        // --- FASE 2: EXTRACCIÓN ESPECÍFICA ---
        console.log(`   [2/6] [TEXTRACT_START]: Ejecutando Queries específicas para ${category}...`);
        const fullOcr = await textract.extractText(bucket, key, category);
        console.log(`🎯 [FULL_OCR_DONE] | Cat: ${category} | Conf: ${fullOcr.confidence?.toFixed(2)}% | Hits: ${Object.values(fullOcr.queryHints || {}).filter(v => v !== null).length}/${Object.keys(fullOcr.queryHints || {}).length} | CUPS: ${fullOcr.queryHints?.CUPS || 'N/A'} | Total: ${fullOcr.queryHints?.TOTAL_AMOUNT || 'N/A'}`);

        const qCount = Object.keys(fullOcr.queryHints || {}).length;
        console.log(`   [2/6] [TEXTRACT_END]: Extracción completada. Campos detectados: ${qCount}`);


        // --- FASE 3: ANÁLISIS SEMÁNTICO (BEDROCK) ---
        console.log(`   [3/6] [BEDROCK_START]: Validando coherencia y limpiando OCR...`);
        const aiAnalysis = await bedrock.analyzeInvoice(fullOcr);
        console.log(`🤖 [AI_ANALYSIS_DONE] | Status: ${aiAnalysis ? '✅' : '❌'} | Vendor_Final: ${aiAnalysis?.vendor_name || 'N/A'} | Total_Final: ${aiAnalysis?.total_amount || 0} ${aiAnalysis?.currency || ''} | kWh: ${aiAnalysis?.consumption_kwh || 0} | CUPS: ${aiAnalysis?.cups || 'N/A'}`);

        const vendor = aiAnalysis.extracted_data.vendor.name || "Desconocido";
        console.log(`   [3/6] [BEDROCK_END]: Auditoría IA lista. Proveedor detectado: ${vendor}`);


        // --- FASE 4: CÁLCULO DE HUELLA (CLIMATIQ) ---
        const lineCount = aiAnalysis.emission_lines?.length || 0;
        console.log(`   [4/6] [CLIMATIQ_START]: Calculando CO2 para ${lineCount} líneas de emisión...`);
        const emissionCalculations = await climatiq.calculateEmissions(
            aiAnalysis.emission_lines, 
            aiAnalysis.dims.country
        );
        console.log(`🌍 [CLIMATIQ_DONE] | Lines: ${emissionCalculations?.results?.length || 0} | Total_CO2e: ${emissionCalculations?.total_co2e?.toFixed(4)} kg | Region: ${aiAnalysis.dims.country} | Source: ${aiAnalysis.emission_lines[0]?.activity_id || 'N/A'}`);

        const totalCo2 = emissionCalculations.reduce((acc, curr) => acc + curr.co2e, 0);
        console.log(`   [4/6] [CLIMATIQ_END]: Cálculo finalizado. Total: ${totalCo2.toFixed(4)} kgCO2e`);


        // --- FASE 5: MAPEO DE DATOS ---
        console.log(`   [5/6] [MAPPER_START]: Construyendo Golden Record para Single-Table Design...`);
        // Recuperas los metadatos que vienen con el evento de S3
        const s3Head = await s3.headObject({ Bucket: bucket, Key: key }).promise();
        const organizationId = s3Head.Metadata['organization-id'] || 'UNKNOWN';

        const goldenRecord = mapper.buildGoldenRecord(
            `ORG#${organizationId}`, 
            key,
            aiAnalysis,
            emissionCalculations
        );

        console.log(`💾 [GOLDEN_RECORD_CREATED] | PK: ${goldenRecord.PK} | SK: ${goldenRecord.SK} | CO2e: ${goldenRecord.total_co2e} kg | Status: READY_FOR_DYNAMO`);
        console.log(`   [5/6] [MAPPER_END]: Mapeo exitoso. SK generado: ${goldenRecord.SK}`);


        // --- FASE 6: PERSISTENCIA ---
        console.log(`   [6/6] [DB_START]: Intentando persistencia transaccional en DynamoDB...`);
        const dbResult = await db.persistTransaction(goldenRecord);
        console.log(`💾 [DB_PERSISTED] | PK: ${goldenRecord.PK} | SK: ${goldenRecord.SK} | Status: ${dbResult ? '✅ SUCCESS' : '❌ FAILED'} | Latency: ${dbResult?.ConsumedCapacity?.CapacityUnits || 'N/A'} RCU/WCU`);

        const duration = (Date.now() - startTime) / 1000;

        if (dbResult?.skipped) {
            console.log(`⚠️ [PIPELINE_END] [ID:${requestId}]: Finalizado (Duplicado omitido) en ${duration}s.`);
        } else {
            console.log(`✅ [PIPELINE_END] [ID:${requestId}]: Proceso exitoso en ${duration}s.`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Success", sk: goldenRecord.SK, duration: `${duration}s` })
        };

    } catch (error) {
        const totalDuration = (Date.now() - startTime) / 1000;
        console.error(`❌ [PIPELINE_CRITICAL_FAILURE] [ID:${requestId}] tras ${totalDuration}s:`, error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: error.message,
                requestId: requestId
            })
        };
    }
};