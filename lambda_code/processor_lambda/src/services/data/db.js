import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

/**
 * @fileoverview Persistencia Atómica corregida para priorizar cronología de factura.
 */
export const persistTransaction = async (record) => {
    const { PK, SK, extracted_data, analytics_dimensions, ai_analysis, climatiq_result } = record;
    
    // 1. DETERMINAR LA FECHA DE REFERENCIA
    // Prioridad: 1. Dimensiones de la IA, 2. Fecha de emisión extraída, 3. Fecha actual (fallback)
    const invoiceDate = extracted_data?.date ? new Date(extracted_data.date) : new Date();
    const now = new Date();
    const isoNow = now.toISOString();
    
    // 2. NORMALIZACIÓN CRONOLÓGICA (Basada en la Factura)
    // Extraemos los valores. Si la IA no detectó el periodo, usamos la fecha de emisión.
    const year    = Number(analytics_dimensions?.period_year)  || invoiceDate.getFullYear();
    const month   = Number(analytics_dimensions?.period_month) || (invoiceDate.getMonth() + 1);
    const day     = Number(analytics_dimensions?.period_day)   || invoiceDate.getDate();
    
    // Calculamos Quarter y Week basados en la fecha de la factura
    const quarter = Math.ceil(month / 3);
    
    // Helper simple para obtener la semana del año de la factura
    const getWeek = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };
    const week = Number(analytics_dimensions?.period_week) || getWeek(invoiceDate);

    const timeData = { year, quarter, month, week, day };

    // 3. PREPARACIÓN DE MÉTRICAS
    const metrics = {
        nCo2e: Number(climatiq_result?.co2e) || 0,
        nSpend: Number(extracted_data?.total_amount) || 0,
        vCons: Number(ai_analysis?.value) || 0,
        uCons: ai_analysis?.unit || "N/A",
        svc: (ai_analysis?.service_type || "unknown").toLowerCase()
    };

    // 4. GENERACIÓN DE OPERACIONES (Ahora impactarán en M05, M03, etc.)
    const statsOps = buildStatsOps(PK, timeData, metrics, isoNow);

    const transactItems = [
        {
            Put: {
                TableName: TABLE_NAME,
                Item: { 
                    ...record, 
                    processed_at: isoNow, 
                    entity_type: "INVOICE",
                    // Campos de indexación para GSI o filtrado rápido
                    period_year: year,
                    period_month: month,
                    period_quarter: quarter
                },
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        ...statsOps
    ];

    try {
        console.log(`[DB]: Persistiendo Factura de ${year}-${month}-${day} en PK: ${PK}`);
        
        const command = new TransactWriteCommand({ TransactItems: transactItems });
        const result = await ddb.send(command);
        
        console.log(`✅ [DB]: Transacción completada. Registro en STATS#${year}#Q${quarter}#M${month.toString().padStart(2, '0')}`);
        return { success: true };

    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            const reasons = error.CancellationReasons;
            if (reasons[0]?.Code === "ConditionalCheckFailed") {
                console.warn(`[DB]: Duplicado detectado para SK: ${SK}`);
                return { success: false, message: "DUPLICATE_INVOICE" };
            }
            console.error("❌ [DB]: Fallo en Transacción:", JSON.stringify(reasons));
        } else {
            console.error("❌ [DB]: Error de Infraestructura:", error.message);
        }
        throw error; 
    }
};

export default { persistTransaction };