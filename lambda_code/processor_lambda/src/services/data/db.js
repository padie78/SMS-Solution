import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

export const persistTransaction = async (record) => {
    const { PK, extracted_data, climatiq_result, ai_analysis } = record;
    const isoNow = new Date().toISOString();

    // 1. EXTRACCIÓN DINÁMICA DE FECHAS (Estructura DynamoDB Map)
    // Accedemos a extracted_data.M.billing_period.M.start.S
    const rawStart = extracted_data?.M?.billing_period?.M?.start?.S;
    const rawEnd = extracted_data?.M?.billing_period?.M?.end?.S;

    const startDate = new Date(rawStart);
    const endDate = new Date(rawEnd);

    // Validación: Si el OCR no detectó periodo, no podemos prorratear
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error("❌ [DATE_ERROR]: No se encontró billing_period válido en extracted_data");
        throw new Error("Missing billing_period for prorating");
    }

    // 2. CÁLCULO DE DÍAS Y MÉTRICAS DIARIAS
    const diffTime = Math.abs(endDate - startDate);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Prorrateo de valores (Manejo de tipos "N" de DynamoDB)
    const dailyMetrics = {
        nCo2e: (Number(climatiq_result?.M?.co2e?.N) || Number(climatiq_result?.co2e) || 0) / totalDays,
        nSpend: (Number(extracted_data?.M?.total_amount?.N) || Number(extracted_data?.total_amount) || 0) / totalDays,
        vCons: (Number(ai_analysis?.M?.value?.N) || Number(ai_analysis?.value) || 0) / totalDays,
        uCons: ai_analysis?.M?.unit?.S || ai_analysis?.unit || "N/A",
        svc: (ai_analysis?.M?.service_type?.S || ai_analysis?.service_type || "unknown").toLowerCase()
    };

    // 3. PERSISTIR REGISTRO DE FACTURA (Metadata)
    try {
        await ddb.send(new TransactWriteCommand({
            TransactItems: [{
                Put: {
                    TableName: TABLE_NAME,
                    Item: { 
                        ...record, 
                        processed_at: isoNow, 
                        total_days_prorated: totalDays,
                        status: "PROCESSED_PRORATED"
                    },
                    ConditionExpression: "attribute_not_exists(SK)"
                }
            }]
        }));
    } catch (e) {
        if (e.name === "TransactionCanceledException") return { success: false, message: "Duplicate" };
        throw e;
    }

    // 4. BUCLE DE GENERACIÓN DE DÍAS (Chunking de 15 días)
    let currentDate = new Date(startDate);
    let batch = [];

    while (currentDate <= endDate) {
        const timeData = {
            year: currentDate.getFullYear(),
            month: currentDate.getMonth() + 1,
            day: currentDate.getDate(),
            quarter: Math.ceil((currentDate.getMonth() + 1) / 3),
            week: getWeekISO(currentDate)
        };

        // Generamos las 5 operaciones (A, Q, M, D, W) para este día
        const dayOps = buildStatsOps(PK, timeData, dailyMetrics, isoNow, totalDays);
        batch.push(...dayOps);

        // Si el batch llega a 75 (15 días procesados), enviamos transacción
        if (batch.length >= 75 || currentDate.getTime() === endDate.getTime()) {
            console.log(`[DB_BATCH]: Enviando bloque de transacciones para el periodo ${currentDate.toISOString().split('T')[0]}`);
            await ddb.send(new TransactWriteCommand({ TransactItems: batch }));
            batch = [];
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return { success: true, processedDays: totalDays };
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