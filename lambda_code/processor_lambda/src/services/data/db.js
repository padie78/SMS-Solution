import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

export const persistTransaction = async (record) => {
    // 1. DESESTRUCTURACIÓN SEGURA
    const { PK, extracted_data, climatiq_result, ai_analysis } = record;
    const isoNow = new Date().toISOString();

    // 2. EXTRACCIÓN DE FECHAS (Soporte para formato DynamoDB JSON y JSON plano)
    // Buscamos: record.extracted_data.M.billing_period.M.start.S
    const billingM = extracted_data?.M?.billing_period?.M || extracted_data?.billing_period;
    
    const rawStart = billingM?.start?.S || billingM?.start;
    const rawEnd = billingM?.end?.S || billingM?.end;

    const startDate = new Date(rawStart);
    const endDate = new Date(rawEnd);

    // Si fallan las fechas de periodo, intentamos usar la fecha de factura como último recurso
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        const fallbackDate = extracted_data?.M?.invoice_date?.S || extracted_data?.invoice_date;
        
        if (!fallbackDate) {
            console.error("❌ [DATE_ERROR]: No hay billing_period ni invoice_date.");
            throw new Error("Missing billing_period for prorating");
        }
        
        console.warn("⚠️ Usando invoice_date como única fecha.");
        // Si usamos una sola fecha, startDate y endDate son iguales
        var finalStart = new Date(fallbackDate);
        var finalEnd = new Date(fallbackDate);
    } else {
        var finalStart = startDate;
        var finalEnd = endDate;
    }

    // 3. CÁLCULO DE DÍAS
    const diffTime = Math.abs(finalEnd - finalStart);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 4. MÉTRICAS DIARIAS (Manejo de N y S)
    const dailyMetrics = {
        nCo2e: (Number(climatiq_result?.M?.co2e?.N) || Number(climatiq_result?.co2e) || 0) / totalDays,
        nSpend: (Number(extracted_data?.M?.total_amount?.N) || Number(extracted_data?.total_amount) || 0) / totalDays,
        vCons: (Number(ai_analysis?.M?.value?.N) || Number(ai_analysis?.value) || 0) / totalDays,
        uCons: ai_analysis?.M?.unit?.S || ai_analysis?.unit || "N/A",
        svc: (ai_analysis?.M?.service_type?.S || ai_analysis?.service_type || "unknown").toLowerCase()
    };

    // 5. GUARDAR FACTURA
    try {
        await ddb.send(new TransactWriteCommand({
            TransactItems: [{
                Put: {
                    TableName: TABLE_NAME,
                    Item: { 
                        ...record, 
                        processed_at: isoNow, 
                        total_days_prorated: totalDays,
                        status: "PROCESSED"
                    },
                    ConditionExpression: "attribute_not_exists(SK)"
                }
            }]
        }));
    } catch (e) {
        if (e.name === "TransactionCanceledException") return { success: false, message: "Duplicate" };
        throw e;
    }

    // 6. BUCLE DE DÍAS (Chunking de 15 días)
    let currentDate = new Date(finalStart);
    let batch = [];

    while (currentDate <= finalEnd) {
        const timeData = {
            year: currentDate.getFullYear(),
            month: currentDate.getMonth() + 1,
            day: currentDate.getDate(),
            quarter: Math.ceil((currentDate.getMonth() + 1) / 3),
            week: getWeekISO(currentDate)
        };

        const dayOps = buildStatsOps(PK, timeData, dailyMetrics, isoNow, totalDays);
        batch.push(...dayOps);

        if (batch.length >= 75 || currentDate.getTime() === finalEnd.getTime()) {
            await ddb.send(new TransactWriteCommand({ TransactItems: batch }));
            batch = [];
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return { success: true };
};

function getWeekISO(d) {
    const target = new Date(d);
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}