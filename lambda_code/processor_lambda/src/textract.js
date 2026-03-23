const { TextractClient, AnalyzeExpenseCommand } = require("@aws-sdk/client-textract");

const client = new TextractClient({ region: process.env.AWS_REGION || "eu-central-1" });

exports.extraerFactura = async (bucket, key) => {
  try {
    const command = new AnalyzeExpenseCommand({
      // Cambio aplicado: Usamos 'Document' con la estructura de S3 directa
      Document: { 
        S3Object: {
          Bucket: bucket,
          Name: key
        }
      }
    });

    const response = await client.send(command);

    if (!response.ExpenseDocuments || response.ExpenseDocuments.length === 0) {
      throw new Error("No se detectaron documentos de gastos en la respuesta.");
    }

    const doc = response.ExpenseDocuments[0];

    // 1. Extraer Campos Resumen (Vendor, Total, Fecha, etc.)
    const summaryFields = {};
    doc.SummaryFields.forEach(field => {
      // Usamos opcional chaining por seguridad si algún campo viene incompleto
      const type = field.Type?.Text;
      const value = field.ValueDetection?.Text;
      if (type) summaryFields[type] = value;
    });

    // 2. Extraer Ítems de Línea (Detalle de productos/servicios)
    const lineItems = doc.LineItemGroups.flatMap(group =>
      group.LineItems.map(item => {
        const itemData = {};
        item.LineItemExpenseFields.forEach(f => {
          const type = f.Type?.Text;
          const value = f.ValueDetection?.Text;
          if (type) itemData[type] = value;
        });
        return itemData;
      })
    );

    return {
      summary: summaryFields,
      items: lineItems,
      rawResponse: response // Ideal para depuración o auditoría
    };

  } catch (error) {
    console.error("Error detallado en AnalyzeExpense:", error);
    throw error;
  }
};