import { TABLE_NAME } from "./client.js";

export const buildStatsOps = (PK, timeData, metrics, isoNow) => {
    const { year, quarter, month, week, day } = timeData;
    const { nCo2e, nSpend, vCons, uCons, svc } = metrics;

    const m = month.toString().padStart(2, '0');
    const w = week.toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const q = quarter.toString();

    const targets = [
        { targetSk: `STATS#YEAR#${year}`, type: 'ANNUAL' },
        { targetSk: `STATS#YEAR#${year}#Q#${q}`, type: 'QUARTERLY' },
        { targetSk: `STATS#YEAR#${year}#M#${m}`, type: 'MONTHLY' },
        { targetSk: `STATS#YEAR#${year}#W#${w}`, type: 'WEEKLY' },
        { targetSk: `STATS#YEAR#${year}#D#${d}`, type: 'DAILY' }
    ];

    return targets.map((item) => {
        const isSmall = item.type === 'WEEKLY' || item.type === 'DAILY';
        const co2Val = isSmall ? nCo2e : nCo2e / 1000;
        const co2Field = isSmall ? 'total_co2e_kg' : 'total_co2e_ton';

        return {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: item.targetSk },
                // USAMOS PROPIEDADES PLANAS: Evita el ValidationError de paths inexistentes
                UpdateExpression: `
                    SET entity_type = :type,
                        last_updated = :now,
                        #svc_unit = :uCons
                    ADD 
                        total_spend :nSpend,
                        ${co2Field} :nCo2,
                        #svc_val :vCons,
                        total_invoices :one
                `,
                ExpressionAttributeNames: {
                    "#svc_unit": `unit_${svc}`,
                    "#svc_val": `val_${svc}`
                },
                ExpressionAttributeValues: {
                    ":type": `${item.type}_METRICS`,
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