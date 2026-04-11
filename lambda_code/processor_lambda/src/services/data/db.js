import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

export const persistTransaction = async (record) => {
    const { PK, SK, extracted_data, analytics_dimensions, ai_analysis } = record;
    const now = new Date();
    
    // 1. Normalización de datos
    const year    = parseInt(analytics_dimensions?.period_year) || now.getFullYear();
    const month   = parseInt(analytics_dimensions?.period_month) || (now.getMonth() + 1);
    const day     = parseInt(analytics_dimensions?.period_day) || now.getDate();
    const quarter = Math.ceil(month / 3);
    const week    = parseInt(analytics_dimensions?.period_week) || 1;

    const metrics = {
        nCo2e: Number(record.climatiq_result?.co2e) || 0,
        nSpend: Number(extracted_data?.total_amount) || 0,
        vCons: Number(ai_analysis?.value) || 0,
        uCons: ai_analysis?.unit || "N/A",
        svc: (ai_analysis?.service_type || "unknown").toLowerCase()
    };

    // 2. Construcción de items
    const statsOps = buildStatsOps(PK, { year, quarter, month, week, day }, metrics, now.toISOString());

    const transactItems = [
        {
            Put: {
                TableName: TABLE_NAME,
                Item: { 
                    ...record, 
                    processed_at: now.toISOString(), 
                    entity_type: "INVOICE" 
                },
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        ...statsOps
    ];

    try {
        console.log(`[DB]: Intentando TransactWrite para ${PK} | Items: ${transactItems.length}`);
        
        const command = new TransactWriteCommand({ TransactItems: transactItems });
        const result = await ddb.send(command);
        
        // Si llegamos acá, Dynamo confirmó la escritura
        console.log("✅ [DB]: Transacción completada. RequestId:", result.$metadata.requestId);
        return { success: true };

    } catch (error) {
        // Log detallado para Debug
        if (error.name === "TransactionCanceledException") {
            // Si la tabla está vacía y da esto, es por un error de lógica en buildStatsOps, no por duplicado.
            console.error("❌ [DB]: Transacción Cancelada. Razones:", JSON.stringify(error.CancellationReasons));
            
            // Si realmente es un duplicado por la ConditionExpression del Invoice
            if (error.CancellationReasons?.some(r => r.Code === "ConditionalCheckFailed")) {
                console.warn("[DB]: La factura ya existe (Duplicate SK).");
                return { success: false, message: "Duplicate" };
            }
        }

        console.error("❌ [DB]: Fallo crítico en persistTransaction:", error.message);
        // LANZAR EL ERROR es clave para que el orquestador no piense que salió bien
        throw error; 
    }
};

export default { persistTransaction };