export const buildStatsOps = (PK, timeData, metrics, isoNow, totalDays = 1) => {
    const { year, quarter, month, week, day } = timeData;
    const { nCo2e, nSpend, vCons, uCons, svc } = metrics;

    const m = `M${month.toString().padStart(2, '0')}`;
    const q = `Q${quarter}`;
    const d = `D${day.toString().padStart(2, '0')}`;
    const w = `W${week.toString().padStart(2, '0')}`;

    const targets = [
        { sk: `STATS#${year}`, type: 'ANNUAL' },
        { sk: `STATS#${year}#${q}`, type: 'QUARTERLY' },
        { sk: `STATS#${year}#${q}#${m}`, type: 'MONTHLY' },
        { sk: `STATS#${year}#${q}#${m}#${d}`, type: 'DAILY' },
        { sk: `STATS#${year}#${w}`, type: 'WEEKLY' } 
    ];

    return targets.map(({ sk, type }) => {
        const isHighLevel = ['ANNUAL', 'QUARTERLY', 'MONTHLY'].includes(type);
        const co2Val = isHighLevel ? (nCo2e / 1000) : nCo2e;
        const co2Field = isHighLevel ? 'ghg_total_co2e_ton' : 'ghg_total_co2e_kg';

        // IMPORTANTE: El contador de facturas se divide por el total de días
        // para que al final del bucle, la suma de 'trazabilidad_total_invoices' sea 1.
        const invoiceFraction = 1 / totalDays;

        const attrNames = {
            "#svc_u": `consumption_${svc}_unit`,
            "#svc_v": `consumption_${svc}_val`,
            "#svc_s": `consumption_${svc}_spend`
        };

        const attrValues = {
            ":type": `${type}_METRICS`,
            ":nSpend": Number(nSpend),
            ":nCo2": Number(co2Val),
            ":vCons": Number(vCons),
            ":uCons": uCons,
            ":fraction": invoiceFraction,
            ":now": isoNow,
            ":emptyMap": {}
        };

        // ... lógica de setClauses (igual a la que tienes)

        return {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: sk },
                UpdateExpression: `
                    SET entity_type = :type, last_updated = :now, #svc_u = :uCons
                    ADD 
                        financials_total_spend :nSpend,
                        ${co2Field} :nCo2,
                        #svc_v :vCons,
                        #svc_s :nSpend,
                        trazabilidad_total_invoices :fraction
                `,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues
            }
        };
    });
};