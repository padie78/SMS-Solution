import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../database/client.js";
import { buildStatsOps } from "../services/operations.js";

export const handler = async (record) => {
    const { PK, extracted_data, analytics_dimensions } = record;
    const now = new Date();
    
    // 1. Extraemos dimensiones temporales
    const year    = analytics_dimensions?.period_year || now.getFullYear();
    const month   = analytics_dimensions?.period_month || (now.getMonth() + 1);
    const day     = analytics_dimensions?.period_day || now.getDate();
    const quarter = Math.ceil(month / 3);
    const week    = Math.ceil(day / 7); // Simplificado

    // 2. Preparamos métricas
    const metrics = {
        nCo2e: record.climatiq_result?.co2e || 0,
        nSpend: extracted_data?.total_amount || 0,
        vCons: record.ai_analysis?.value || 0,
        uCons: record.ai_analysis?.unit || "N/A",
        svc: (record.ai_analysis?.service_type || "UNKNOWN").toLowerCase()
    };

    // 3. Ejecutamos transacción atómica
    const transactItems = [
        {
            Put: {
                TableName: TABLE_NAME,
                Item: { ...record, processed_at: now.toISOString(), entity_type: "INVOICE" }
            }
        },
        ...buildStatsOps(PK, { year, quarter, month, week, day }, metrics, now.toISOString())
    ];

    try {
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        return { statusCode: 200, body: "OK" };
    } catch (error) {
        console.error("Error persistiendo datos:", error);
        throw error;
    }
};