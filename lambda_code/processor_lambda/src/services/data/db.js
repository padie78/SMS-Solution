import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

/**
 * @fileoverview Persistencia Atómica - Prioriza la fecha real de la factura (05 May)
 * sobre fallbacks genéricos.
 */
export const persistTransaction = async (record) => {
    const { PK, SK, extracted_data, analytics_dimensions, ai_analysis, climatiq_result } = record;
    const now = new Date();
    const isoNow = now.toISOString();

    // --- LÓGICA DE EXTRACCIÓN DE FECHA CORREGIDA ---
    let year, month, day;

    // 1. Intentamos parsear la fecha de emisión (La más precisa para el 'día')
    if (extracted_data?.date) {
        const d = new Date(extracted_data.date);
        if (!isNaN(d.getTime())) {
            year = d.getFullYear();
            month = d.getMonth() + 1;
            day = d.getDate(); // Aquí captura el "05" de tu factura
        }
    }

    // 2. Si la IA detectó un periodo específico (analytics_dimensions), sobreescribimos 
    // el año y mes si son diferentes (por si la factura se emitió en Mayo pero el consumo es Abril)
    if (analytics_dimensions?.period_year) year = Number(analytics_dimensions.period_year);
    if (analytics_dimensions?.period_month) month = Number(analytics_dimensions.period_month);
    
    // Si la IA detectó un día de periodo específico, lo usamos. 
    // Si no, mantenemos el día de la factura o usamos 1 como fallback mínimo (NO 28).
    if (analytics_dimensions?.period_day) {
        day = Number(analytics_dimensions.period_day);
    } else if (!day) {
        day = 1; 
    }

    // 3. Fallback final de seguridad (Hoy)
    if (!year || !month) {
        year = now.getFullYear();
        month = now.getMonth() + 1;
        day = now.getDate();
    }

    const quarter = Math.ceil(month / 3);
    
    // Cálculo de semana basado en la fecha final validada
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
                    period_day: day
                },
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        ...statsOps
    ];

    try {
        console.log(`[DB_EXECUTE]: Registrando para ${year}-${month}-${day} (SK: STATS#${year}#Q${quarter}#M${month.toString().padStart(2, '0')}#D${day.toString().padStart(2, '0')})`);
        
        const command = new TransactWriteCommand({ TransactItems: transactItems });
        await ddb.send(command);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            if (error.CancellationReasons[0]?.Code === "ConditionalCheckFailed") {
                return { success: false, message: "Duplicate Invoice" };
            }
        }
        console.error("❌ [DB_ERROR]:", error.message);
        throw error; 
    }
};

export default { persistTransaction };