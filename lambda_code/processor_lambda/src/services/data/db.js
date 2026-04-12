import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

/**
 * @fileoverview Persistencia con Prorrateo Diario.
 * Distribuye métricas proporcionalmente entre el rango de fechas detectado.
 */
export const persistTransaction = async (record) => {
    const { PK, extracted_data, analytics_dimensions, climatiq_result, ai_analysis } = record;
    const isoNow = new Date().toISOString();

    // 1. Determinar Rango de Fechas
    const startDate = new Date(analytics_dimensions?.period_start || extracted_data?.invoice_date || extracted_data?.date);
    const endDate = new Date(analytics_dimensions?.period_end || extracted_data?.invoice_date || extracted_data?.date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error("❌ [DB_ERROR]: Rango de fechas no válido para prorrateo.");
        throw new Error("Invalid date range");
    }

    // 2. Cálculo de días y métricas diarias
    const diffTime = Math.abs(endDate - startDate);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const dailyMetrics = {
        nCo2e: (Number(climatiq_result?.co2e) || 0) / totalDays,
        nSpend: (Number(extracted_data?.total_amount) || 0) / totalDays,
        vCons: (Number(ai_analysis?.value) || 0) / totalDays,
        uCons: ai_analysis?.unit || "N/A",
        svc: (ai_analysis?.service_type || "unknown").toLowerCase()
    };

    // 3. Generar operaciones para cada día del rango
    let allStatsOps = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        const quarter = Math.ceil(month / 3);
        
        const getWeekISO = (d) => {
            const target = new Date(d);
            const dayNr = (target.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNr + 3);
            const firstThursday = target.valueOf();
            target.setMonth(0, 1);
            if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
            return 1 + Math.ceil((firstThursday - target) / 604800000);
        };

        const timeData = { 
            year, 
            quarter, 
            month, 
            week: getWeekISO(currentDate), 
            day 
        };
        
        const opsForThisDay = buildStatsOps(PK, timeData, dailyMetrics, isoNow, totalDays);
        allStatsOps.push(...opsForThisDay);

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 4. Ejecución de Transacción Atómica
    const transactItems = [
        {
            Put: {
                TableName: TABLE_NAME,
                Item: { 
                    ...record, 
                    processed_at: isoNow, 
                    total_days_prorated: totalDays,
                    period_metadata: {
                        start: startDate.toISOString().split('T')[0],
                        end: endDate.toISOString().split('T')[0]
                    }
                },
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        ...allStatsOps
    ];

    try {
        console.log(`[DB_EXECUTE]: Procesando ${totalDays} días para PK: ${PK}`);
        const command = new TransactWriteCommand({ TransactItems: transactItems });
        await ddb.send(command);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            if (error.CancellationReasons[0]?.Code === "ConditionalCheckFailed") {
                return { success: false, message: "Duplicate Invoice" };
            }
        }
        console.error("❌ [DB_FATAL]:", error.message);
        throw error; 
    }
};

export default { persistTransaction };