import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";

export const persistTransaction = async (record) => {
    const { PK, SK, extracted_data, analytics_dimensions, ai_analysis, climatiq_result } = record;
    const now = new Date();
    const isoNow = now.toISOString();

    let year, month, day;

    // 1. FUENTE DE VERDAD: Fecha del documento (invoice_date)
    const rawDate = extracted_data?.invoice_date || extracted_data?.date;

    if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
            year = d.getFullYear();
            month = d.getMonth() + 1;
            day = d.getDate();
        }
    }

    // 2. LOGS DE AUDITORÍA (Para ver qué está pasando en CloudWatch)
    console.log(`[FECHA_DOC]: Detectada fecha ${year}-${month}-${day} desde invoice_date`);

    /**
     * 3. REFINAMIENTO SEGURO:
     * Solo usamos los datos de la IA si NO logramos sacar la fecha del documento.
     * Esto evita que el "3" de la IA pise el "4" de tu factura de Abril.
     */
    if (!year && analytics_dimensions?.period_year) {
        year = Number(analytics_dimensions.period_year);
        console.log(`[FECHA_IA]: Usando Año de IA: ${year}`);
    }
    
    if (!month && analytics_dimensions?.period_month) {
        month = Number(analytics_dimensions.period_month);
        console.log(`[FECHA_IA]: Usando Mes de IA: ${month}`);
    }

    // El día lo tomamos de la IA solo si no lo tenemos ya (el 05 o 03)
    if (!day) {
        day = Number(analytics_dimensions?.period_day) || 1;
    }

    // 4. FALLBACK TOTAL (Hoy)
    if (!year || !month) {
        year = now.getFullYear();
        month = now.getMonth() + 1;
        day = day || now.getDate();
        console.log(`[FECHA_FALLBACK]: Usando fecha del sistema: ${year}-${month}-${day}`);
    }

    const quarter = Math.ceil(month / 3);
    
    // Cálculo de semana ISO 8601
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

    console.log(`[JERARQUIA_FINAL]: STATS#${year}#Q${quarter}#M${month.toString().padStart(2, '0')}#D${day.toString().padStart(2, '0')}`);

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
        const command = new TransactWriteCommand({ TransactItems: transactItems });
        await ddb.send(command);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            if (error.CancellationReasons[0]?.Code === "ConditionalCheckFailed") {
                return { success: false, message: "Duplicate" };
            }
        }
        throw error; 
    }
};

export default { persistTransaction };