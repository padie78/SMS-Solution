import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

/**
 * @fileoverview Persistencia Atómica - Mapeo exacto a invoice_date para evitar fallbacks erróneos.
 */
export const persistTransaction = async (record) => {
    const { PK, SK, extracted_data, analytics_dimensions, ai_analysis, climatiq_result } = record;
    const now = new Date();
    const isoNow = now.toISOString();

    // --- LÓGICA DE EXTRACCIÓN DE FECHA BLINDADA ---
    let year, month, day;

    // 1. Prioridad: Mapeo exacto al campo que confirmaste en Dynamo
    const rawDate = extracted_data?.invoice_date || extracted_data?.date;

    if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
            year = d.getFullYear();
            month = d.getMonth() + 1;
            day = d.getDate(); // <--- Aquí captura el "05"
        }
    }

    // 2. Refinamiento por dimensiones de la IA (Periodo de Consumo)
    // Si la IA detectó que el consumo es de un mes/año distinto al de emisión, el periodo manda.
    if (analytics_dimensions?.period_year) year = Number(analytics_dimensions.period_year);
    if (analytics_dimensions?.period_month) month = Number(analytics_dimensions.period_month);
    
    // Solo sobreescribimos el día si la IA detectó un día de cierre de periodo específico.
    // Si no existe period_day, mantenemos el día de la factura (el 05).
    if (analytics_dimensions?.period_day) {
        day = Number(analytics_dimensions.period_day);
    }

    // 3. Fallbacks finales de seguridad (Solo si los pasos anteriores fallaron)
    if (!day) day = 1; 
    if (!year || !month) {
        year = now.getFullYear();
        month = now.getMonth() + 1;
        day = day || now.getDate();
    }

    const quarter = Math.ceil(month / 3);
    
    // Cálculo de semana ISO basado en la fecha final validada
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

    // --- PREPARACIÓN DE MÉTRICAS ---
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
                    period_month: month,
                    period_day: day // Guardamos el día calculado para trazabilidad
                },
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        ...statsOps
    ];

    try {
        // El log ahora te confirmará el D05 antes de escribir
        console.log(`[DB_EXECUTE]: Registrando para ${year}-${month}-${day} (SK: STATS#${year}#Q${quarter}#M${month.toString().padStart(2, '0')}#D${day.toString().padStart(2, '0')})`);
        
        const command = new TransactWriteCommand({ TransactItems: transactItems });
        await ddb.send(command);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            if (error.CancellationReasons[0]?.Code === "ConditionalCheckFailed") {
                console.warn(`[DB]: Factura duplicada omitida: ${SK}`);
                return { success: false, message: "Duplicate Invoice" };
            }
        }
        console.error("❌ [DB_ERROR]:", error.message);
        throw error; 
    }
};

export default { persistTransaction };