import { TABLE_NAME } from "./client.js";

export const buildStatsOps = (PK, timeData, metrics, isoNow) => {
    const { year, quarter, month, week, day } = timeData;
    const { nCo2e, nSpend, vCons, uCons, svc } = metrics;

    const m = month.toString().padStart(2, '0');
    const w = week.toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const q = quarter.toString();

    const targets = [
        { sk: `STATS#YEAR#${year}`, type: 'ANNUAL' },
        { sk: `STATS#YEAR#${year}#Q#${q}`, type: 'QUARTERLY' },
        { sk: `STATS#YEAR#${year}#M#${m}`, type: 'MONTHLY' },
        { sk: `STATS#YEAR#${year}#W#${w}`, type: 'WEEKLY' },
        { sk: `STATS#YEAR#${year}#D#${d}`, type: 'DAILY' }
    ];

    // En buildStatsOps dentro de operations.js
    return {
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: sk },
            // Eliminamos SET de mapas, Dynamo los crea solo si usas el path completo en ADD
            UpdateExpression: `
            SET entity_type = :type,
                last_updated = :now,
                consumption_mix.#svc_name.unit = :uCons
            ADD 
                financials.total_spend :nSpend,
                ghg_inventory.${co2Field} :nCo2,
                consumption_mix.#svc_name.val :vCons,
                trazabilidad.total_invoices_processed :one
        `,
            ExpressionAttributeNames: {
                "#svc_name": svc
            },
            ExpressionAttributeValues: {
                ":type": `${type}_METRICS`,
                ":nSpend": Number(nSpend),
                ":nCo2": Number(co2Val),
                ":vCons": Number(vCons),
                ":uCons": uCons,
                ":one": 1,
                ":now": isoNow
            }
        }
    };
};