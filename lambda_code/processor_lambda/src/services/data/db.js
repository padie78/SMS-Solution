import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

export const persistTransaction = async (record) => {
    const { PK, extracted_data, climatiq_result, ai_analysis } = record;
    const isoNow = new Date().toISOString();

    // 1. Extracción de fechas (Formato DynamoDB M/S)
    const billingM = extracted_data?.M?.billing_period?.M || extracted_data?.billing_period;
    const rawStart = billingM?.start?.S || billingM?.start;
    const rawEnd = billingM?.end?.S || billingM?.end;

    const startDate = new Date(rawStart);
    const endDate = new Date(rawEnd);

    if (isNaN(startDate.getTime())) throw new Error("Missing valid billing_period");

    const totalDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // 2. Métricas unitarias
    const dailyMetrics = {
        nCo2e: (Number(climatiq_result?.M?.co2e?.N) || 0) / totalDays,
        nSpend: (Number(extracted_data?.M?.total_amount?.N) || 0) / totalDays,
        vCons: (Number(ai_analysis?.M?.value?.N) || 0) / totalDays,
        uCons: ai_analysis?.M?.unit?.S || "N/A",
        svc: (ai_analysis?.M?.service_type?.S || "unknown").toLowerCase()
    };

    // 3. REGISTRO DE FACTURA (Primero y solo)
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
    } catch (e) {
        if (e.name === "TransactionCanceledException") return { success: false, message: "Duplicate" };
        throw e;
    }

    // 4. AGREGACIÓN EN MEMORIA (Para evitar múltiples operaciones sobre el mismo SK)
    const statsMap = new Map(); // Key: SK, Value: Aggregated Data

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const timeData = {
            year: currentDate.getFullYear(),
            month: currentDate.getMonth() + 1,
            day: currentDate.getDate(),
            quarter: Math.ceil((currentDate.getMonth() + 1) / 3),
            week: getWeekISO(currentDate)
        };

        // Generar keys para este día
        const keys = [
            `STATS#${timeData.year}`,
            `STATS#${timeData.year}#Q${timeData.quarter}`,
            `STATS#${timeData.year}#Q${timeData.quarter}#M${String(timeData.month).padStart(2, '0')}`,
            `STATS#${timeData.year}#Q${timeData.quarter}#M${String(timeData.month).padStart(2, '0')}#D${String(timeData.day).padStart(2, '0')}`,
            `STATS#${timeData.year}#W${String(timeData.week).padStart(2, '0')}`
        ];

        keys.forEach(sk => {
            const current = statsMap.get(sk) || { nSpend: 0, nCo2e: 0, vCons: 0, count: 0, type: getLevel(sk) };
            current.nSpend += dailyMetrics.nSpend;
            current.nCo2e += dailyMetrics.nCo2e;
            current.vCons += dailyMetrics.vCons;
            current.count += (1 / totalDays);
            current.timeData = timeData; // Solo para referencia en la última iteración
            statsMap.set(sk, current);
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 5. CONVERTIR MAPA A OPERACIONES DYNAMODB
    const finalOps = Array.from(statsMap.entries()).map(([sk, data]) => {
        return buildStatsOps(PK, sk, data, dailyMetrics.uCons, dailyMetrics.svc, isoNow);
    });

    // 6. ENVIAR EN BATCHES DE 100 (DynamoDB Limit)
    for (let i = 0; i < finalOps.length; i += 100) {
        const chunk = finalOps.slice(i, i + 100);
        await ddb.send(new TransactWriteCommand({ TransactItems: chunk }));
    }

    return { success: true };
};

// Helpers necesarios
function getLevel(sk) {
    if (sk.includes("#D")) return "DAILY";
    if (sk.includes("#W")) return "WEEKLY";
    if (sk.includes("#M")) return "MONTHLY";
    if (sk.includes("#Q")) return "QUARTERLY";
    return "ANNUAL";
}

function getWeekISO(d) {
    const target = new Date(d);
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}