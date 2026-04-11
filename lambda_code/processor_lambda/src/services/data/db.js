import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

export const persistTransaction = async (record) => {
    // Usamos el ID de la factura como parte de la SK para evitar duplicados
    const { PK, SK, extracted_data, analytics_dimensions, ai_analysis } = record;
    const now = new Date();
    
    // 1. Dimensiones temporales (asegurando tipos numéricos)
    const year    = parseInt(analytics_dimensions?.period_year) || now.getFullYear();
    const month   = parseInt(analytics_dimensions?.period_month) || (now.getMonth() + 1);
    const day     = parseInt(analytics_dimensions?.period_day) || now.getDate();
    const quarter = Math.ceil(month / 3);
    const week    = parseInt(analytics_dimensions?.period_week) || Math.ceil(day / 7);

    // 2. Preparación de métricas con lógica de negocio
    const metrics = {
        nCo2e: Number(record.climatiq_result?.co2e) || 0,
        nSpend: Number(extracted_data?.total_amount) || 0,
        vCons: Number(ai_analysis?.value) || 0,
        uCons: ai_analysis?.unit || "N/A",
        svc: (ai_analysis?.service_type || "UNKNOWN").toLowerCase(),
        // Determinamos Scope basado en el servicio (Lógica ejemplo)
        scope: ai_analysis?.service_type === "ELECTRICITY" ? 2 : 1 
    };

    // 3. Construcción de la Transacción
    const transactItems = [
        {
            Put: {
                TableName: TABLE_NAME,
                Item: { 
                    ...record, 
                    processed_at: now.toISOString(), 
                    entity_type: "INVOICE" 
                },
                // CRÍTICO: Evita duplicar acumulados si la Lambda reintenta
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        // Desglosa la factura en las 5 estructuras (YEAR, PERIOD, MONTH, WEEK, DAY)
        ...buildStatsOps(PK, { year, quarter, month, week, day }, metrics, now.toISOString())
    ];

    try {
        console.log(`[DB]: Persistiendo transacción jerárquica para ${PK}`);
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        return { success: true, message: "Cálculos actualizados en todos los niveles" };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            console.warn("[DB]: La factura ya fue procesada anteriormente.");
            return { success: false, message: "Duplicate record" };
        }
        console.error("❌ Error en persistencia jerárquica:", error);
        throw error;
    }
};

export default { persistTransaction };