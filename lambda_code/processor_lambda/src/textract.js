const { 
    TextractClient, 
    StartExpenseAnalysisCommand, 
    GetExpenseAnalysisCommand 
} = require("@aws-sdk/client-textract");

const textractClient = new TextractClient({ region: process.env.AWS_REGION || "eu-central-1" });

exports.extraerFactura = async (bucket, key) => {
    // IMPORTANTE: No re-decodificamos aquí porque el index ya lo hizo.
    console.log(`[TEXTRACT] Iniciando Job para Bucket: ${bucket} | Key: ${key}`);

    try {
        const startCommand = new StartExpenseAnalysisCommand({
            DocumentLocation: { S3Object: { Bucket: bucket, Name: key } }
        });
        
        const { JobId } = await textractClient.send(startCommand);
        
        let finished = false;
        let response;
        let attempts = 0;

        while (!finished && attempts < 25) { // Subimos a 25 intentos (50 seg total)
            attempts++;
            await new Promise(r => setTimeout(r, 2000));

            const getCommand = new GetExpenseAnalysisCommand({ JobId });
            response = await textractClient.send(getCommand);

            if (response.JobStatus === "SUCCEEDED") {
                finished = true;
            } else if (response.JobStatus === "FAILED") {
                // Si falla aquí, imprimimos el error real de AWS
                throw new Error(`AWS Textract Job Failed: ${response.StatusMessage}`);
            }
            console.log(`[TEXTRACT] Intento ${attempts}: ${response.JobStatus}`);
        }

        if (!finished) throw new Error("Textract timeout.");

        // Procesamiento de bloques de texto (LINE)
        const fullText = (response.Blocks || [])
            .filter(b => b.BlockType === "LINE")
            .map(b => b.Text)
            .join(" ");

        // Procesamiento de campos financieros
        const rawHints = {};
        const expenseDoc = response.ExpenseDocuments?.[0];
        if (expenseDoc?.SummaryFields) {
            expenseDoc.SummaryFields.forEach(f => {
                rawHints[f.Type?.Text] = f.ValueDetection?.Text;
            });
        }

        return {
            summary: fullText.trim(),
            query_hints: {
                VENDOR: rawHints.VENDOR_NAME || rawHints.NAME,
                TOTAL_AMOUNT: rawHints.TOTAL,
                CURRENCY: rawHints.CURRENCY,
                INVOICE_DATE: rawHints.INVOICE_RECEIPT_DATE,
                ACCOUNT_ID: rawHints.ACCOUNT_NUMBER,
                RAW: rawHints
            },
            metadata: { pages: response.DocumentMetadata?.Pages, jobId: JobId }
        };

    } catch (error) {
        // Si el error es "UnsupportedDocumentFormat", es que S3 no le está pasando el archivo bien
        console.error("[TEXTRACT_ERROR]:", error.message);
        throw error;
    }
};