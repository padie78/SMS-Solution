const textract = require("./services/textract");
const classifier = require("./services/classifier");
const bedrock = require("./services/bedrock");
const climatiq = require("./services/climatiq");
const mapper = require("./services/mapper");
const db = require("./services/db");

exports.handler = async (event) => {
    const startTime = Date.now();
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    // ID de correlación simple para seguir el rastro en logs
    const requestId = context.awsRequestId || Math.random().toString(36).substring(7);

    console.log(`🚀 [PIPELINE_START] [ID:${requestId}]: Iniciando proceso para s3://${bucket}/${key}`);

    try {
        // --- FASE 1: CLASIFICACIÓN ---
        console.log(`   [1/6] [CLASSIFY_START]: Extrayendo texto base para identificación...`);
        const initialOcr = await textract.extractText(bucket, key, "OTHERS");
        
        const category = await classifier.identifyCategory(initialOcr.rawText);
        console.log(`   [1/6] [CLASSIFY_END]: Categoría resuelta -> ${category}`);


        // --- FASE 2: EXTRACCIÓN ESPECÍFICA ---
        console.log(`   [2/6] [TEXTRACT_START]: Ejecutando Queries específicas para ${category}...`);
        const fullOcr = await textract.extractText(bucket, key, category);
        const qCount = Object.keys(fullOcr.queryHints || {}).length;
        console.log(`   [2/6] [TEXTRACT_END]: Extracción completada. Campos detectados: ${qCount}`);


        // --- FASE 3: ANÁLISIS SEMÁNTICO (BEDROCK) ---
        console.log(`   [3/6] [BEDROCK_START]: Validando coherencia y limpiando OCR...`);
        const aiAnalysis = await bedrock.analyzeInvoice(fullOcr);
        const vendor = aiAnalysis.extracted_data.vendor.name || "Desconocido";
        console.log(`   [3/6] [BEDROCK_END]: Auditoría IA lista. Proveedor detectado: ${vendor}`);


        // --- FASE 4: CÁLCULO DE HUELLA (CLIMATIQ) ---
        const lineCount = aiAnalysis.emission_lines?.length || 0;
        console.log(`   [4/6] [CLIMATIQ_START]: Calculando CO2 para ${lineCount} líneas de emisión...`);
        const emissionCalculations = await climatiq.calculateEmissions(
            aiAnalysis.emission_lines, 
            aiAnalysis.dims.country
        );
        const totalCo2 = emissionCalculations.reduce((acc, curr) => acc + curr.co2e, 0);
        console.log(`   [4/6] [CLIMATIQ_END]: Cálculo finalizado. Total: ${totalCo2.toFixed(4)} kgCO2e`);


        // --- FASE 5: MAPEO DE DATOS ---
        console.log(`   [5/6] [MAPPER_START]: Construyendo Golden Record para Single-Table Design...`);
        const goldenRecord = mapper.buildGoldenRecord(
            "ORG#98765", 
            key,
            aiAnalysis,
            emissionCalculations
        );
        console.log(`   [5/6] [MAPPER_END]: Mapeo exitoso. SK generado: ${goldenRecord.SK}`);


        // --- FASE 6: PERSISTENCIA ---
        console.log(`   [6/6] [DB_START]: Intentando persistencia transaccional en DynamoDB...`);
        const dbResult = await db.persistTransaction(goldenRecord);
        
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