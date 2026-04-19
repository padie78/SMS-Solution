import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

export const persistTransaction = async (record) => {
    const { PK, SK } = record;
    const isoNow = new Date().toISOString();

    // 1. RESOLVER METADATA (Blindado contra formatos de DynamoDB)
    // Extraemos el contenido real de metadata, ya sea que venga como .M o plano
    const rawMetadata = record.metadata?.M || record.metadata || {};
    
    // 2. EXTRACCIÓN DE FECHAS Y MÉTRICAS (Igual que antes)
    const billing = record.extracted_data?.M?.billing_period?.M || record.extracted_data?.billing_period || {};
    const rawStart = billing.start?.S || billing.start;
    const rawEnd = billing.end?.S || billing.end;
    const startDate = new Date(rawStart);
    const endDate = new Date(rawEnd);
    const totalDays = Math.max(1, Math.ceil(Math.abs(endDate - startDate) / 86400000) + 1);

    // 3. PERSISTENCIA CON MERGE DE METADATA
    try {
        await ddb.send(new TransactWriteCommand({
            TransactItems: [{
                Put: {
                    TableName: TABLE_NAME,
                    Item: { 
                        ...record, // Mantiene todo el registro original
                        processed_at: isoNow, 
                        status: "DONE",
                        total_days_prorated: totalDays,
                        // RE-CONSTRUCCIÓN DE METADATA
                        metadata: {
                            ...rawMetadata, // Aquí inyectamos el s3_key, upload_date, etc.
                            processed_at: isoNow,
                            status: "VALIDATED",
                            last_update_type: "AGGREGATION_COMPLETED"
                        }
                    },
                    ConditionExpression: "attribute_not_exists(SK) OR #st <> :done",
                    ExpressionAttributeNames: { "#st": "status" },
                    ExpressionAttributeValues: { ":done": "DONE" }
                }
            }]
        }));
    } catch (e) {
        if (e.name === "TransactionCanceledException") return { success: false, message: "Duplicate" };
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