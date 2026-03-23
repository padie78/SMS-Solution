const { 
  TextractClient, 
  StartExpenseAnalysisCommand, 
  GetExpenseAnalysisCommand 
} = require("@aws-sdk/client-textract");

const client = new TextractClient({ region: process.env.AWS_REGION || "eu-central-1" });

exports.extraerFactura = async (bucket, key) => {
  try {
    // 1. Iniciar el análisis (Asíncrono)
    // Usamos DocumentLocation, que es el estándar para archivos en S3
    const startCommand = new StartExpenseAnalysisCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: bucket,
          Name: key
        }
      }
    });

    const { JobId } = await client.send(startCommand);
    console.log(`Análisis iniciado. JobId: ${JobId}`);

    // 2. Esperar a que Textract termine de procesar (Polling)
    let finished = false;
    let response;

    while (!finished) {
      // Esperamos 2 segundos entre intentos para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 2000));

      const getCommand = new GetExpenseAnalysisCommand({ JobId });
      response = await client.send(getCommand);

      if (response.JobStatus === "SUCCEEDED") {
        finished = true;
      } else if (response.JobStatus === "FAILED") {
        throw new Error(`El análisis de Textract falló para el JobId: ${JobId}`);
      }
      // Si sigue IN_PROGRESS, el bucle continúa
    }

    // 3. Procesar los resultados (Soporta múltiples documentos/páginas)
    const allSummaryFields = {};
    const allLineItems = [];

    for (const doc of response.ExpenseDocuments) {
      // Extraer Resumen
      doc.SummaryFields?.forEach(field => {
        const type = field.Type?.Text;
        const value = field.ValueDetection?.Text;
        if (type) allSummaryFields[type] = value;
      });

      // Extraer Ítems de línea
      doc.LineItemGroups?.forEach(group => {
        group.LineItems?.forEach(item => {
          const itemData = {};
          item.LineItemExpenseFields.forEach(f => {
            const type = f.Type?.Text;
            const value = f.ValueDetection?.Text;
            if (type) itemData[type] = value;
          });
          allLineItems.push(itemData);
        });
      });
    }

    return {
      summary: allSummaryFields,
      items: allLineItems,
      jobId: JobId,
      rawResponse: response 
    };

  } catch (error) {
    console.error("Error en el flujo de extracción:", error);
    throw error;
  }
};