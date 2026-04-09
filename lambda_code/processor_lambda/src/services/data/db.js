export const persistTransaction = async (record) => {
    // Extraemos PK y SK directamente del record generado
    const { PK, SK, extracted_data, analytics_dimensions } = record;
    
    const now = new Date();
    const isoNow = now.toISOString();

    // Verificación de seguridad: Si no hay SK, el pipeline morirá aquí
    if (!SK) {
        throw new Error("❌ [DB_ERROR]: El record no contiene un SK válido.");
    }

    const nSpend = Number(extracted_data?.total_amount) || 0;
    const nCo2e = Number(record.climatiq_result?.co2e) || 0;
    
    const year = analytics_dimensions?.period_year || now.getFullYear();
    const month = analytics_dimensions?.period_month || (now.getMonth() + 1);
    const quarter = Math.floor((month - 1) / 3) + 1;

    // Normalizamos variables para las operaciones
    const taxId = String(extracted_data?.VENDOR_TAX_ID || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, '');
    const vName = extracted_data?.vendor || "UNKNOWN_VENDOR";
    const bId = analytics_dimensions?.branch_id || "MAIN";
    const aId = analytics_dimensions?.asset_id || "GENERIC_ASSET";
    const svc = record.ai_analysis?.service_type || "UNKNOWN";

    const transactItems = [
        {
            Put: {
                TableName: TABLE_NAME,
                Item: {
                    ...record,
                    entity_type: "INVOICE",
                    processed_at: isoNow
                },
                // Si intentas procesar el MISMO archivo dos veces, esto saltará
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        ...buildStatsOps(PK, year, month, quarter, nCo2e, nSpend, isoNow),
        buildVendorOp(PK, taxId, vName, nCo2e, isoNow),
        ...buildInfrastructureOps(PK, bId, aId, svc, isoNow),
        buildBudgetUpdateOp(PK, year, nCo2e, isoNow)
    ];

    try {
        console.log(`📡 [DB_ATTEMPT]: Persistiendo factura con SK: ${SK}`);
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            const reason = error.CancellationReasons[0].Code;
            if (reason === "ConditionalCheckFailed") {
                console.warn(`⚠️ [DB_DUPLICATE]: La factura con SK ${SK} ya existe.`);
                return { success: false, reason: "DUPLICATE" };
            }
            console.error("❌ [DB_TRANSACTION_FAILED]:", JSON.stringify(error.CancellationReasons));
        }
        throw error;
    }
};