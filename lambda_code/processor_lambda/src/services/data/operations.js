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

    return targets.map(({ sk, type }) => {
        const isSmall = type === 'WEEKLY' || type === 'DAILY';
        const co2Val = isSmall ? nCo2e : nCo2e / 1000;
        const co2Field = isSmall ? 'total_co2e_kg' : 'total_co2e_ton';

        return {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: sk },
                // Eliminamos la inicialización de mapas anidados que causaba el 'overlap'
                // DynamoDB crea los mapas intermedios automáticamente con ADD si el path es válido
                UpdateExpression: `
                    SET entity_type = :type,
                        last_updated = :now,
                        consumption_mix.#svc_name.#unit_name = :uCons
                    ADD 
                        financials.total_spend :nSpend,
                        ghg_inventory.${co2Field} :nCo2,
                        consumption_mix.#svc_name.#val_name :vCons,
                        trazabilidad.total_invoices_processed :one
                `,
                ExpressionAttributeNames: {
                    "#svc_name": svc,
                    "#val_name": "val",
                    "#unit_name": "unit"
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
    });
};