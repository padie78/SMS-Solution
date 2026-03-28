exports.saveInvoiceWithStats = async (item) => {
    const { orgId, year, month, serviceType, co2e, totalAmount } = item.internal_refs;
    
    const params = {
        TransactItems: [
            {
                // Registro Detallado: Sin cambios, funciona bien.
                Put: {
                    TableName: process.env.DYNAMO_TABLE,
                    Item: item.full_record
                }
            },
            {
                // Actualización Atómica de Estadísticas: Corregida
                Update: {
                    TableName: process.env.DYNAMO_TABLE,
                    Key: { PK: `ORG#${orgId}`, SK: `STATS#${year}` },
                    UpdateExpression: `
                        SET by_month.#m = if_not_exists(by_month.#m, :empty_month),
                            by_service.#s = if_not_exists(by_service.#s, :zero)
                        ADD total_co2e_kg :co2, 
                            total_spend :money,
                            invoice_count :one,
                            by_month.#m.co2 :co2,
                            by_month.#m.spend :money,
                            by_service.#s :co2
                    `,
                    ExpressionAttributeNames: {
                        "#m": month,
                        "#s": serviceType
                    },
                    ExpressionAttributeValues: {
                        ":co2": co2e,
                        ":money": totalAmount,
                        ":one": 1,
                        ":zero": 0,
                        ":empty_month": { co2: 0, spend: 0 } // Estructura inicial del mes
                    }
                }
            }
        ]
    };

    try {
        return await dynamo.send(new TransactWriteCommand(params));
    } catch (error) {
        console.error("🚨 [DYNAMO_TRANSACTION_FAILED]:", JSON.stringify(error, null, 2));
        throw error;
    }
};