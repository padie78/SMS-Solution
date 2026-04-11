import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

/**
 * @fileoverview Persistencia Atómica corregida para priorizar cronología de factura.
 */
export const persistTransaction = async (record) => {
    const { PK, SK, extracted_data, analytics_dimensions, ai_analysis, climatiq_result } = record;
    const now = new Date();
    const isoNow = now.toISOString();

    // --- LÓGICA DE EXTRACCIÓN DE FECHA CRÍTICA ---
    let year, month, day;

    // 1. Intentamos sacar de analytics_dimensions (lo más confiable si la IA lo llenó)
    if (analytics_dimensions?.period_year && analytics_dimensions?.period_month) {
        year = Number(analytics_dimensions.period_year);
        month = Number(analytics_dimensions.period_month);
        day = Number(analytics_dimensions.period_day) || 28; // Default al cierre si no hay día
    } 
    // 2. Si no, parseamos manualmente la fecha de emisión (ej: "2026-05-05" o "05/05/2026")
    else if (extracted_data?.date) {
        const d = new Date(extracted_data.date);
        if (!isNaN(d.getTime())) {
            year = d.getFullYear();
            month = d.getMonth() + 1;
            day = d.getDate();
        }
    }

    // 3. Fallback final (Si todo falla, ahí sí usamos 'now', pero avisamos en log)
    if (!year || !month) {
        console.warn("[DB_WARNING]: No se pudo determinar fecha de factura, usando fecha actual.");
        year = now.getFullYear();
        month = now.getMonth() + 1;
        day = now.getDate();
    }

    const quarter = Math.ceil(month / 3);
    
    // Forzamos la semana basada en la fecha que acabamos de validar
    const getWeek = (y, m, d) => {
        const target = new Date(y, m - 1, d);
        const dayNr = (target.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
        return 1 + Math.ceil((firstThursday - target) / 604800000);
    };
    const week = getWeek(year, month, day);

    const timeData = { year, quarter, month, week, day };

    // --- RESTO IGUAL ---
    const metrics = {
        nCo2e: Number(climatiq_result?.co2e) || 0,
        nSpend: Number(extracted_data?.total_amount) || 0,
        vCons: Number(ai_analysis?.value) || 0,
        uCons: ai_analysis?.unit || "N/A",
        svc: (ai_analysis?.service_type || "unknown").toLowerCase()
    };

    const statsOps = buildStatsOps(PK, timeData, metrics, isoNow);

    const transactItems = [
        {
            Put: {
                TableName: TABLE_NAME,
                Item: { 
                    ...record, 
                    processed_at: isoNow, 
                    entity_type: "INVOICE",
                    period_year: year,
                    period_month: month
                },
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        ...statsOps
    ];

    try {
        // Este log te dirá exactamente qué está intentando escribir
        console.log(`[DB_EXECUTE]: Registrando para periodo ${year}-${month} (SK: STATS#${year}#Q${quarter}#M${month.toString().padStart(2, '0')})`);
        
        const command = new TransactWriteCommand({ TransactItems: transactItems });
        await ddb.send(command);
        return { success: true };
    } catch (error) {
        console.error("❌ [DB_ERROR]:", error.message);
        throw error; 
    }
};

export default { persistTransaction };