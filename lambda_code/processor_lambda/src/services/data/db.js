import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

/**
 * @fileoverview Persistencia Atómica - Registra Factura y Actualiza Agregadores (Jerarquía Path-based).
 * Garantiza que si la actualización de un KPI falla, la factura no se marque como procesada.
 */
export const persistTransaction = async (record) => {
    const { PK, SK, extracted_data, analytics_dimensions, ai_analysis, climatiq_result } = record;
    const now = new Date();
    const isoNow = now.toISOString();
    
    // 1. Normalización Robusta de Dimensiones Temporales
    // Es vital que year/month/day sean consistentes para la jerarquía STATS#2026#Q1#M04#D11
    const year    = Number(analytics_dimensions?.period_year) || now.getFullYear();
    const month   = Number(analytics_dimensions?.period_month) || (now.getMonth() + 1);
    const day     = Number(analytics_dimensions?.period_day) || now.getDate();
    const week    = Number(analytics_dimensions?.period_week) || 1; // Debería venir calculado del pipeline
    const quarter = Math.ceil(month / 3);

    const timeData = { year, quarter, month, week, day };

    // 2. Preparación de Métricas para buildStatsOps
    const metrics = {
        nCo2e: Number(climatiq_result?.co2e) || 0,
        nSpend: Number(extracted_data?.total_amount) || 0,
        vCons: Number(ai_analysis?.value) || 0,
        uCons: ai_analysis?.unit || "N/A",
        svc: (ai_analysis?.service_type || "unknown").toLowerCase()
    };

    // 3. Generación de las 5 operaciones de actualización (ANNUAL -> DAILY)
    const statsOps = buildStatsOps(PK, timeData, metrics, isoNow);

    // 4. Construcción del array para TransactWrite
    const transactItems = [
        {
            // Operación 1: Guardar la Factura (INV#...)
            Put: {
                TableName: TABLE_NAME,
                Item: { 
                    ...record, 
                    processed_at: isoNow, 
                    entity_type: "INVOICE",
                    // Aseguramos que los campos de búsqueda existan en el nivel raíz
                    period_year: year,
                    period_month: month
                },
                // Protección contra doble procesamiento de un mismo archivo
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        // Operaciones 2 a 6: Agregadores Atómicos
        ...statsOps
    ];

    try {
        console.log(`[DB]: Iniciando TransactWrite para PK: ${PK} | SK: ${SK}`);
        
        const command = new TransactWriteCommand({ TransactItems: transactItems });
        const result = await ddb.send(command);
        
        console.log(`✅ [DB]: Transacción exitosa. RequestId: ${result.$metadata.requestId}`);
        return { success: true };

    } catch (error) {
        // Manejo de errores específico de Transacciones de DynamoDB
        if (error.name === "TransactionCanceledException") {
            const reasons = error.CancellationReasons;
            console.error("❌ [DB]: Transacción Cancelada. Razones:", JSON.stringify(reasons));
            
            // La razón index 0 siempre corresponde al PUT de la Factura (la ConditionExpression)
            if (reasons[0]?.Code === "ConditionalCheckFailed") {
                console.warn(`[DB]: Salto de escritura. La factura ${SK} ya existe en la base de datos.`);
                return { success: false, message: "DUPLICATE_INVOICE" };
            }

            // Si falla cualquier otra (índice > 0), es un error de configuración de la tabla o tipos
            const failedIndex = reasons.findIndex(r => r.Code !== "None");
            console.error(`[DB]: Falló el item en índice ${failedIndex}. Código: ${reasons[failedIndex]?.Code}`);
        } else {
            console.error("❌ [DB]: Error inesperado de infraestructura:", error.message);
        }

        // Re-lanzamos para que el orquestador (Lambda/Step Functions) maneje el re-intento o Dead Letter Queue
        throw error; 
    }
};

export default { persistTransaction };