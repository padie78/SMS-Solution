export const persistTransaction = async (record) => {
    // 1. Extracción y sanitización de datos (Evita que la transacción falle por variables undefined)
    const { PK, SK, extracted_data, analytics_dimensions, climatiq_result, ai_analysis } = record;
    
    const now = new Date();
    const isoNow = now.toISOString();

    // Valores numéricos seguros
    const nSpend = Number(extracted_data?.total_amount) || 0;
    const nCo2e = Number(climatiq_result?.co2e) || 0;

    // Dimensiones temporales
    const year = analytics_dimensions?.period_year || now.getFullYear();
    const month = analytics_dimensions?.period_month || (now.getMonth() + 1);
    const quarter = Math.floor((month - 1) / 3) + 1;

    // Identificadores de entidades
    const taxId = String(extracted_data?.VENDOR_TAX_ID || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, '');
    const vName = extracted_data?.vendor || "UNKNOWN_VENDOR";
    const bId = analytics_dimensions?.branch_id || "MAIN";
    const aId = analytics_dimensions?.asset_id || "GENERIC_ASSET";
    const svc = ai_analysis?.service_type || "UNKNOWN";

    // 2. Construcción del array de transacciones
    const transactItems = [
        // A. Registro de la Factura (con protección contra duplicados)
        {
            Put: {
                TableName: TABLE_NAME,
                Item: {
                    ...record,
                    entity_type: "INVOICE",
                    updatedAt: isoNow
                },
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },

        // B. Estadísticas (Spread porque buildStatsOps devuelve un ARRAY de 3 operaciones)
        ...buildStatsOps(PK, year, month, quarter, nCo2e, nSpend, isoNow),

        // C. Vendor (Es un objeto único, NO lleva spread)
        buildVendorOp(PK, taxId, vName, nCo2e, isoNow),

        // D. Infraestructura (Spread porque devuelve ARRAY de 2 operaciones: Branch y Asset)
        ...buildInfrastructureOps(PK, bId, aId, svc, isoNow),
        
        // E. Presupuesto (Es un objeto único, NO lleva spread)
        buildBudgetUpdateOp(PK, year, nCo2e, isoNow)
    ];

    // 3. Ejecución
    try {
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        return { success: true, sk: SK };
    } catch (error) {
        // Manejo de errores específico para saber qué falló
        if (error.name === "TransactionCanceledException") {
            console.error("❌ Transacción cancelada. Razones:", JSON.stringify(error.CancellationReasons));
            return { success: false, reason: "TRANSACTION_CANCELLED", detail: error.CancellationReasons };
        }
        throw error;
    }
};