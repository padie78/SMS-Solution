import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

export const persistTransaction = async (record) => {
    // 0. DESESTRUCTURACIÓN DE ENTRADA
    const { PK, SK, extracted_data, climatiq_result, ai_analysis, metadata } = record;
    const isoNow = new Date().toISOString();

    // 1. EXTRACCIÓN Y VALIDACIÓN DE FECHAS (Sin eliminar soporte Marshalled)
    const billing = extracted_data?.M?.billing_period?.M || extracted_data?.billing_period || {};
    const rawStart = billing.start?.S || billing.start;
    const rawEnd = billing.end?.S || billing.end;
    
    const facilityId = metadata?.M?.facility_id?.S || metadata?.facility_id || "GENERAL_ASSET";

    const startDate = new Date(rawStart);
    const endDate = new Date(rawEnd);

    // Validación de seguridad para evitar bucles infinitos por inconsistencia de fechas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
        throw new Error(`Invalid billing_period dates for SK: ${SK}`);
    }

    const diffTime = Math.abs(endDate - startDate);
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    // 2. EXTRACCIÓN DE MÉTRICAS (Adaptado a climatiq_result.co2e y ai_analysis.value)
    const totalCo2 = Number(climatiq_result?.M?.co2e?.N || climatiq_result?.co2e || 0);
    const totalAmount = Number(extracted_data?.M?.total_amount?.N || extracted_data?.total_amount || 0);
    const totalCons = Number(ai_analysis?.M?.value?.N || ai_analysis?.value || 0);
    
    const unit = (ai_analysis?.M?.unit?.S || ai_analysis?.unit || "kWh").toUpperCase();
    const service = (ai_analysis?.M?.service_type?.S || ai_analysis?.service_type || "unknown").toLowerCase();

    const dailyMetrics = {
        nCo2e: totalCo2 / totalDays,
        nSpend: totalAmount / totalDays,
        vCons: totalCons / totalDays
    };

    // 3. REGISTRO DE EVIDENCIA (OPCIÓN B: Validación por Estado para evitar duplicados)
    try {
        await ddb.send(new TransactWriteCommand({
            TransactItems: [{
                Put: {
                    TableName: TABLE_NAME,
                    Item: { 
                        ...record, 
                        processed_at: isoNow, 
                        total_days_prorated: totalDays,
                        status: "DONE" 
                    },
                    // Permite guardar si no existe o si existe pero no está en estado DONE
                    ConditionExpression: "attribute_not_exists(SK) OR #st <> :done",
                    ExpressionAttributeNames: { "#st": "status" },
                    ExpressionAttributeValues: { ":done": "DONE" }
                }
            }]
        }));
    } catch (e) {
        if (e.name === "TransactionCanceledException") {
            console.warn(`[DB] ⚠️ Registro ${SK} ya procesado. Omitiendo duplicado.`);
            return { success: false, message: "Duplicate" };
        }
        throw e;
    }

    // 4. AGREGACIÓN EN MEMORIA (Todas las llaves originales restauradas)
    const statsMap = new Map();
    let currentDate = new Date(startDate);
    let iterations = 0;

    while (currentDate <= endDate && iterations < 730) {
        iterations++;
        const y = currentDate.getFullYear();
        const mNum = currentDate.getMonth() + 1;
        const mStr = String(mNum).padStart(2, '0');
        const q = Math.ceil(mNum / 3);
        const wStr = String(getWeekISO(currentDate)).padStart(2, '0');
        const dStr = String(currentDate.getDate()).padStart(2, '0');

        const keys = [
            { sk: `STATS#${y}`, type: 'ANNUAL' },
            { sk: `STATS#${y}#Q${q}#M${mStr}`, type: 'MONTHLY' },
            { sk: `STATS#${y}#Q${q}#M${mStr}#D${dStr}`, type: 'DAILY' },
            { sk: `STATS#${y}#W${wStr}`, type: 'WEEKLY' },
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

    // 5. PERSISTENCIA POR BLOQUES (Máximo 100 por TransactWriteItems)
    const finalOps = Array.from(statsMap.entries()).map(([sk, data]) => 
        buildStatsOps(PK, sk, data, unit, service, isoNow)
    );

    for (let i = 0; i < finalOps.length; i += 100) {
        const chunk = finalOps.slice(i, i + 100);
        try {
            await ddb.send(new TransactWriteCommand({ TransactItems: chunk }));
        } catch (err) {
            console.error(`❌ Fallo en bloque de estadísticas para ${SK}:`, err);
        }
    }

    return { success: true };
};

// Función helper ISO original
function getWeekISO(d) {
    const target = new Date(d);
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}