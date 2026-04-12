import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

export const persistTransaction = async (record) => {
    const { PK, extracted_data, analytics_dimensions, climatiq_result, ai_analysis } = record;
    const isoNow = new Date().toISOString();

    const startDate = new Date(analytics_dimensions?.period_start || extracted_data?.invoice_date);
    const endDate = new Date(analytics_dimensions?.period_end || extracted_data?.invoice_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new Error("Invalid dates");

    const totalDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const dailyMetrics = {
        nCo2e: (Number(climatiq_result?.co2e) || 0) / totalDays,
        nSpend: (Number(extracted_data?.total_amount) || 0) / totalDays,
        vCons: (Number(ai_analysis?.value) || 0) / totalDays,
        uCons: ai_analysis?.unit || "N/A",
        svc: (ai_analysis?.service_type || "unknown").toLowerCase()
    };

    // --- PRIMERA TRANSACCIÓN: Registro de la Factura ---
    // La factura se registra sola primero para asegurar el ConditionExpression
    try {
        await ddb.send(new TransactWriteCommand({
            TransactItems: [{
                Put: {
                    TableName: TABLE_NAME,
                    Item: { ...record, processed_at: isoNow, total_days_prorated: totalDays },
                    ConditionExpression: "attribute_not_exists(SK)"
                }
            }]
        }));
    } catch (error) {
        if (error.name === "TransactionCanceledException") return { success: false, message: "Duplicate" };
        throw error;
    }

    // --- PROCESAMIENTO POR BLOQUES (CHUNKING) ---
    let currentDate = new Date(startDate);
    let allOps = [];

    while (currentDate <= endDate) {
        const timeData = { 
            year: currentDate.getFullYear(), 
            month: currentDate.getMonth() + 1, 
            day: currentDate.getDate(),
            quarter: Math.ceil((currentDate.getMonth() + 1) / 3),
            week: getWeekISO(currentDate)
        };
        
        allOps.push(...buildStatsOps(PK, timeData, dailyMetrics, isoNow, totalDays));
        currentDate.setDate(currentDate.getDate() + 1);

        // Si acumulamos 80 operaciones (aprox 16 días), mandamos el bloque
        if (allOps.length >= 80 || currentDate > endDate) {
            await ddb.send(new TransactWriteCommand({ TransactItems: allOps }));
            allOps = []; // Limpiamos para el siguiente bloque
        }
    }

    return { success: true };
};

// Helper para semana ISO
function getWeekISO(d) {
    const target = new Date(d);
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}