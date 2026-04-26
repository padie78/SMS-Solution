import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

export const persistTransaction = async (goldenRecord) => {
    const { PK, SK, extracted_data, climatiq_result, ai_analysis, metadata } = goldenRecord;
    const isoNow = new Date().toISOString();

    // 1. CÁLCULO DE DÍAS Y MÉTRICAS (Mantenemos tu lógica de prorrateo)
    const billing = extracted_data?.billing_period || {};
    const startDate = new Date(billing.start);
    const endDate = new Date(billing.end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
        throw new Error(`[VAL_ERROR] Fechas inválidas para prorrateo en SK: ${SK}`);
    }

    const diffTime = Math.abs(endDate - startDate);
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const dailyMetrics = {
        nCo2e: (climatiq_result?.co2e || 0) / totalDays,
        nSpend: (extracted_data?.total_amount || 0) / totalDays,
        vCons: (ai_analysis?.value || 0) / totalDays
    };

    const unit = (ai_analysis?.unit || "kWh").toUpperCase();
    const service = (ai_analysis?.service_type || "unknown").toLowerCase();

    // 2. PREPARACIÓN DE OPERACIONES TRANSACTIONALES
    try {
        // Operación A: Actualizar el Registro Maestro (De Skeleton a Golden)
        const masterUpdate = {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK },
                // Usamos UpdateExpression para NO pisar lo que el Dispatcher ya creó
                UpdateExpression: `SET 
                    #st = :done, 
                    ai_analysis = :ai, 
                    climatiq_result = :cr, 
                    extracted_data = :ed, 
                    processed_at = :now,
                    total_days_prorated: :days,
                    metadata = :meta`,
                ConditionExpression: "#st = :processing", // Solo si sigue en procesamiento
                ExpressionAttributeNames: { "#st": "status" },
                ExpressionAttributeValues: {
                    ":done": "DONE",
                    ":processing": "PROCESSING",
                    ":ai": ai_analysis,
                    ":cr": climatiq_result,
                    ":ed": extracted_data,
                    ":now": isoNow,
                    ":days": totalDays,
                    ":meta": {
                        ...metadata,
                        processed_at: isoNow,
                        status: "VALIDATED",
                        is_draft: false
                    }
                }
            }
        };

        // 3. MOTOR DE AGREGACIÓN (Tu lógica de StatsMap se mantiene igual)
        const statsMap = new Map();
        let currentDate = new Date(startDate);
        let iterations = 0;

        while (currentDate <= endDate && iterations < 730) {
            iterations++;
            // ... (Toda tu lógica de generación de keys STATS# igual que antes)
            // [Omitido por brevedad, pero mantené tu bloque de while(currentDate <= endDate)]
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 4. EJECUCIÓN TRANSACTIONAL
        // Nota: DynamoDB tiene un límite de 100 items por transacción.
        const statsOps = Array.from(statsMap.entries()).map(([sk, data]) =>
            buildStatsOps(PK, sk, data, unit, service, isoNow)
        );

        // Agrupamos la actualización del maestro con las primeras estadísticas
        const allOps = [masterUpdate, ...statsOps];

        for (let i = 0; i < allOps.length; i += 100) {
            const chunk = allOps.slice(i, i + 100);
            await ddb.send(new TransactWriteCommand({ TransactItems: chunk }));
        }

        console.log(`✅ [DB] | Invoice ${SK} y estadísticas actualizadas.`);
        return { success: true };

    } catch (e) {
        if (e.name === "TransactionCanceledException") {
            console.warn(`⚠️ [DB] | La transacción falló (posiblemente ya procesada o fechas inválidas): ${SK}`);
            return { success: false };
        }
        throw e;
    }
};