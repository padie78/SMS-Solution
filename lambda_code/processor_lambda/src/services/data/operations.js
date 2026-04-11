import { TABLE_NAME } from "./client.js";

export const buildStatsOps = (PK, timeData, metrics, isoNow) => {
    const { year, quarter, month, week, day } = timeData;
    const { nCo2e, nSpend, vCons, uCons, svc } = metrics;

    const m = month.toString().padStart(2, '0');
    const w = week.toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const q = quarter.toString();

    const targets = [
        { sk: `STATS#YEAR#${year}#TOTAL`, type: 'ANNUAL' },
        { sk: `STATS#YEAR#${year}#PERIOD#${q}#TOTAL`, type: 'QUARTERLY' },
        { sk: `STATS#YEAR#${year}#PERIOD#${q}#MONTH#${m}#TOTAL`, type: 'MONTHLY' },
        { sk: `STATS#YEAR#${year}#PERIOD#${q}#MONTH#${m}#WEEK#${w}#TOTAL`, type: 'WEEKLY' },
        { sk: `STATS#YEAR#${year}#PERIOD#${q}#MONTH#${m}#WEEK#${w}#DAY#${d}`, type: 'DAILY' }
    ];

    return targets.map(({ sk, type }) => {
        const isSmall = type === 'WEEKLY' || type === 'DAILY';
        const co2Val = isSmall ? nCo2e : nCo2e / 1000;
        const co2Field = isSmall ? 'total_co2e_kg' : 'total_co2e_ton';

        return {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: sk },
                // Usamos placeholders (#) para los nombres de atributos reservados
                UpdateExpression: `
                    SET entity_type = :type,
                        financials.total_spend = if_not_exists(financials.total_spend, :zero) + :nSpend,
                        ghg_inventory.${co2Field} = if_not_exists(ghg_inventory.${co2Field}, :zero) + :nCo2,
                        consumption_mix.#svc_name.#val_name = if_not_exists(consumption_mix.#svc_name.#val_name, :zero) + :vCons,
                        consumption_mix.#svc_name.#unit_name = :uCons,
                        trazabilidad.total_invoices_processed = if_not_exists(trazabilidad.total_invoices_processed, :zero) + :one,
                        last_updated = :now
                `,
                // Definimos qué significa cada placeholder (#)
                ExpressionAttributeNames: {
                    "#svc_name": svc,      // El tipo de servicio (gas, electricity, etc)
                    "#unit_name": "unit",   // Mapeamos la palabra reservada 'unit'
                    "#val_name": "val"      // Mapeamos 'val' por seguridad
                },
                ExpressionAttributeValues: {
                    ":type": `${type}_METRICS`,
                    ":nSpend": Number(nSpend),
                    ":nCo2": co2Val,
                    ":vCons": Number(vCons),
                    ":uCons": uCons,
                    ":one": 1,
                    ":zero": 0,
                    ":now": isoNow
                }
            }
        };
    });
};