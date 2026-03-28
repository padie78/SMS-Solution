const { 
    TextractClient, 
    StartExpenseAnalysisCommand, 
    GetExpenseAnalysisCommand 
} = require("@aws-sdk/client-textract");

const textractClient = new TextractClient({ region: process.env.AWS_REGION || "eu-central-1" });

/**
 * Procesa facturas en PDF, JPG, PNG o TIFF.
 * El flujo asíncrono es compatible con todos estos formatos siempre que vengan de S3.
 */
exports.extraerFactura = async (bucket, key) => {
    const startTime = Date.now();
    const extension = key.split('.').pop().toLowerCase();
    
    console.log(`=== [TEXTRACT_JOB_START] ===`);
    console.log(`Archivo: s3://${bucket}/${key} | Formato detectado: ${extension}`);

    // Validación rápida de formatos soportados por Textract
    const formatosSoportados = ['pdf', 'jpg', 'jpeg', 'png', 'tiff'];
    if (!formatosSoportados.includes(extension)) {
        throw new Error(`Formato .${extension} no soportado por AWS Textract.`);
    }

    try {
        // AWS detecta el MIME type automáticamente desde S3, 
        // pero la estructura del comando StartExpenseAnalysisCommand es la misma.
        const startCommand = new StartExpenseAnalysisCommand({
            DocumentLocation: { 
                S3Object: { 
                    Bucket: bucket, 
                    Name: key 
                } 
            }
        });
        
        const startResponse = await textractClient.send(startCommand);
        const jobId = startResponse.JobId;
        console.log(`Job ID asignado: ${jobId}`);

        let finished = false;
        let response;
        let attempts = 0;

        // Polling loop (igual para todos los formatos)
        while (!finished && attempts < 30) { 
            attempts++;
            await new Promise(r => setTimeout(r, 2000));
            const getCommand = new GetExpenseAnalysisCommand({ JobId: jobId });
            response = await textractClient.send(getCommand);
            
            console.log(`[TEXTRACT_POLLING] Intento ${attempts} | Estado: ${response.JobStatus}`);
            
            if (response.JobStatus === "SUCCEEDED") finished = true;
            else if (response.JobStatus === "FAILED") throw new Error(`AWS Textract Job Failed: ${response.StatusMessage}`);
        }

        if (!finished) throw new Error(`Timeout tras ${attempts} intentos.`);

        const processTime = Date.now() - startTime;
        console.log(`=== [TEXTRACT_RESPONSE_RECEIVED] ===`);

        // --- EXTRACCIÓN HÍBRIDA (Optimizado para fotos/JPG y PDFs) ---
        let fullText = (response.Blocks || [])
            .filter(b => b.BlockType === "LINE")
            .map(b => b.Text)
            .join(" | ");

        const detailedLines = [];
        const rawHints = {};
        const expenseDoc = response.ExpenseDocuments?.[0];

        if (expenseDoc) {
            // Campos de cabecera
            if (expenseDoc.SummaryFields) {
                expenseDoc.SummaryFields.forEach(f => {
                    rawHints[f.Type?.Text || "UNKNOWN"] = f.ValueDetection?.Text || "N/A";
                });
            }

            // Tablas de consumo (muy importante en JPGs de facturas escaneadas)
            if (expenseDoc.LineItemGroups) {
                expenseDoc.LineItemGroups.forEach(group => {
                    group.LineItems?.forEach(item => {
                        const line = item.LineItemExpenseFields
                            ?.map(f => `${f.Type?.Text || 'DESC'}: ${f.ValueDetection?.Text}`)
                            .join(" | ");
                        if (line) detailedLines.push(`[DETALLE_CONSUMO]: ${line}`);
                    });
                });
            }

            // Si es un JPG, a veces response.Blocks viene vacío pero SummaryFields no.
            if (!fullText) {
                const backupText = [];
                expenseDoc.SummaryFields?.forEach(f => {
                    if (f.LabelDetection?.Text) backupText.push(f.LabelDetection.Text);
                    if (f.ValueDetection?.Text) backupText.push(f.ValueDetection.Text);
                });
                fullText = backupText.filter(Boolean).join(" ");
            }
        }

        const summaryForAI = `
        FORMAT: ${extension.toUpperCase()}
        DOCUMENT_RAW_TEXT: ${fullText}
        STRUCTURED_LINE_ITEMS: ${detailedLines.join("\n")}
        `.trim();

        const result = {
            summary: summaryForAI,
            query_hints: {
                VENDOR: rawHints.VENDOR_NAME || rawHints.NAME || "UNKNOWN",
                TOTAL_AMOUNT: rawHints.TOTAL || rawHints.AMOUNT_DUE || "0",
                CURRENCY: rawHints.CURRENCY || "ILS",
                INVOICE_DATE: rawHints.INVOICE_RECEIPT_DATE || rawHints.DATE || null,
                ACCOUNT_ID: rawHints.ACCOUNT_NUMBER || rawHints.CUSTOMER_NUMBER || "N/A",
                RAW: rawHints 
            },
            metadata: { 
                pages: response.DocumentMetadata?.Pages || 1, 
                jobId: jobId,
                format: extension,
                latency_ms: processTime
            }
        };

        console.log(`✅ [TEXTRACT_SUCCESS] Formato: ${extension} | Caracteres Summary: ${result.summary.length}`);
        return result;

    } catch (error) {
        console.error(`🚨 [TEXTRACT_FATAL_ERROR]`, error.message);
        throw error;
    }
};