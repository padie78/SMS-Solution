import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

export const persistTransaction = async (record) => {
    // 1. LIMPIEZA INICIAL: Detectar si el record viene "Marshalled" (con .S, .M, etc)
    // Extraemos metadata con fallback para ambos formatos
    const rawMetadata = record.metadata?.M || record.metadata || {};
    const isoNow = new Date().toISOString();

    // 2. PREPARAR EL ITEM DE SALIDA
    // Clonamos el record para no mutar el original
    const cleanItem = { ...record };

    // Si los campos vienen en formato DynamoDB { S: "..." }, los extraemos para la lógica
    const billing = record.extracted_data?.M?.billing_period?.M || record.extracted_data?.billing_period || {};
    const rawStart = billing.start?.S || billing.start;
    const rawEnd = billing.end?.S || billing.end;

    const startDate = new Date(rawStart);
    const endDate = new Date(rawEnd);
    
    const diffTime = Math.abs(endDate - startDate);
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    // 3. MERGE DE METADATA SEGURO
    // Reconstruimos el objeto metadata asegurándonos de NO perder s3_key ni facility_id
    const finalMetadata = {
        ...rawMetadata, // Aquí vienen s3_key, upload_date, etc.
        status: { S: "VALIDATED" }, // Forzamos formato DynamoDB si el resto del record es Marshalled
        processed_at: { S: isoNow },
        is_draft: { BOOL: false }
    };

    // Si tu cliente de DynamoDB NO es el DocumentClient (que limpia los tipos automáticamente),
    // necesitamos asegurarnos de que el PutItem sea consistente:
    
    try {
        await ddb.send(new TransactWriteCommand({
            TransactItems: [{
                Put: {
                    TableName: TABLE_NAME,
                    Item: { 
                        ...cleanItem,
                        status: { S: "DONE" },
                        processed_at: { S: isoNow },
                        total_days_prorated: { N: totalDays.toString() },
                        metadata: { M: finalMetadata } // Lo metemos dentro de M
                    },
                    // Mantenemos la protección para no procesar dos veces
                    ConditionExpression: "attribute_not_exists(SK) OR #st <> :done",
                    ExpressionAttributeNames: { "#st": "status" },
                    ExpressionAttributeValues: { ":done": { S: "DONE" } }
                }
            }]
        }));
    } catch (e) {
        if (e.name === "TransactionCanceledException") {
            console.warn(`[DB] ⚠️ Registro ${SK} ya procesado.`);
            return { success: false, message: "Duplicate" };
        }
        throw e;
    }

    // 5. AGREGACIÓN DE ESTADÍSTICAS (Stats Mapping)
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

    // 6. PERSISTENCIA DE STATS
    const finalOps = Array.from(statsMap.entries()).map(([sk, data]) =>
        buildStatsOps(PK, sk, data, unit, service, isoNow)
    );

    for (let i = 0; i < finalOps.length; i += 100) {
        const chunk = finalOps.slice(i, i + 100);
        try {
            await ddb.send(new TransactWriteCommand({ TransactItems: chunk }));
        } catch (err) {
            console.error(`❌ Error en batch stats para ${SK}:`, err);
        }
    }

    return { success: true };
};

// Helpers (getWeekISO permanece igual)
function getWeekISO(d) {
    const target = new Date(d);
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}