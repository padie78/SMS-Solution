import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

export const persistTransaction = async (record) => {
    const { PK, extracted_data, climatiq_result, ai_analysis, metadata } = record;
    const isoNow = new Date().toISOString();

    // 1. EXTRACCIÓN DE FECHAS Y FACILITY
    const billingM = extracted_data?.M?.billing_period?.M || extracted_data?.billing_period;
    const rawStart = billingM?.start?.S || billingM?.start;
    const rawEnd = billingM?.end?.S || billingM?.end;
    
    // Identificamos la planta/edificio (Facility)
    const facilityId = metadata?.M?.facility_id?.S || metadata?.facility_id || "GENERAL_ASSET";

    const startDate = new Date(rawStart);
    const endDate = new Date(rawEnd);
    if (isNaN(startDate.getTime())) throw new Error("Invalid billing_period");

    const totalDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // 2. EXTRACCIÓN DE MÉTRICAS NORMALIZADA
    const totalCo2 = Number(climatiq_result?.M?.co2e?.N || climatiq_result?.co2e || 0);
    const totalAmount = Number(extracted_data?.M?.total_amount?.N || extracted_data?.total_amount || 0);
    const totalCons = Number(ai_analysis?.M?.value?.N || ai_analysis?.value || 0);
    const unit = ai_analysis?.M?.unit?.S || ai_analysis?.unit || "N/A";
    const service = (ai_analysis?.M?.service_type?.S || ai_analysis?.service_type || "unknown").toLowerCase();

    const dailyMetrics = {
        nCo2e: totalCo2 / totalDays,
        nSpend: totalAmount / totalDays,
        vCons: totalCons / totalDays
    };

    // 3. REGISTRO DE EVIDENCIA (Invoice Item)
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
        if (e.name === "TransactionCanceledException") return { success: false, message: "Duplicate Invoice" };
        throw e;
    }

    // 4. AGREGACIÓN MULTI-NIVEL (Org + Facility)
    const statsMap = new Map();
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth() + 1;
        const q = Math.ceil(m / 3);
        const w = getWeekISO(currentDate);
        const dStr = String(currentDate.getDate()).padStart(2, '0');
        const mStr = String(m).padStart(2, '0');
        const wStr = String(w).padStart(2, '0');

        const keys = [
            // Nivel Global Organización
            { sk: `STATS#${y}`, type: 'ANNUAL' },
            { sk: `STATS#${y}#Q${q}#M${mStr}`, type: 'MONTHLY' },
            { sk: `STATS#${y}#Q${q}#M${mStr}#D${dStr}`, type: 'DAILY' },
            { sk: `STATS#${y}#W${wStr}`, type: 'WEEKLY' },
            
            // Nivel Específico de Facility (Planta/Edificio)
            { sk: `STATS#${y}#FACILITY#${facilityId}`, type: 'ANNUAL' },
            { sk: `STATS#${y}#Q${q}#M${mStr}#FACILITY#${facilityId}`, type: 'MONTHLY' }
        ];

        keys.forEach(({ sk, type }) => {
            const current = statsMap.get(sk) || { nSpend: 0, nCo2e: 0, vCons: 0, count: 0, type };
            current.nSpend += dailyMetrics.nSpend;
            current.nCo2e += dailyMetrics.nCo2e;
            current.vCons += dailyMetrics.vCons;
            current.count += (1 / totalDays);
            statsMap.set(sk, current);
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 5. PERSISTENCIA DE ESTADÍSTICAS POR BLOQUES
    const finalOps = Array.from(statsMap.entries()).map(([sk, data]) => 
        buildStatsOps(PK, sk, data, unit, service, isoNow)
    );

    for (let i = 0; i < finalOps.length; i += 100) {
        await ddb.send(new TransactWriteCommand({ 
            TransactItems: finalOps.slice(i, i + 100) 
        }));
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