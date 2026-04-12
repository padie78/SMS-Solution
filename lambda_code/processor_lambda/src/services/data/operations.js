import { TABLE_NAME } from "./client.js";
import { calculateSMSMetrics } from "../../utils/analytics.js";

export const buildStatsOps = (PK, timeData, metrics, isoNow, totalDays = 1, orgSettings = {}) => {
    const { year, quarter, month, week, day } = timeData;
    const { nCo2e, nSpend, vCons, uCons, svc } = metrics;
    const kpis = calculateSMSMetrics(metrics, orgSettings);

    const keys = {
        m: `M${month.toString().padStart(2, '0')}`,
        q: `Q${quarter}`,
        d: `D${day.toString().padStart(2, '0')}`,
        w: `W${week.toString().padStart(2, '0')}`
    };

    const targets = [
        { sk: `STATS#${year}`, type: 'ANNUAL' },
        { sk: `STATS#${year}#${keys.q}`, type: 'QUARTERLY' },
        { sk: `STATS#${year}#${keys.q}#${keys.m}`, type: 'MONTHLY' },
        { sk: `STATS#${year}#${keys.q}#${keys.m}#${keys.d}`, type: 'DAILY' },
        { sk: `STATS#${year}#${keys.w}`, type: 'WEEKLY' } 
    ];

    return targets.map(({ sk, type }) => {
        const isHighLevel = ['ANNUAL', 'QUARTERLY', 'MONTHLY'].includes(type);
        const co2Val = isHighLevel ? (nCo2e / 1000) : nCo2e;
        const co2Field = isHighLevel ? 'ghg_total_co2e_ton' : 'ghg_total_co2e_kg';

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
            ":fraction": 1 / totalDays,
            ":now": isoNow,
            ":k": kpis.normalization || {}
        };

        let setClauses = [
            `entity_type = :type`,
            `last_updated = :now`,
            `#svc_u = :uCons`,
            `kpis_snapshot = :k`
        ];

        // Definición dinámica de metadatos para evitar errores de atributos no usados
        if (isHighLevel) {
            setClauses.push(`metadata = if_not_exists(metadata, :defaultMeta)`);
            attrValues[":defaultMeta"] = { version: "1.0" };
        }

        return {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: sk },
                UpdateExpression: `SET ${setClauses.join(', ')} ADD financials_total_spend :nSpend, ${co2Field} :nCo2, #svc_v :vCons, #svc_s :nSpend, trazabilidad_total_invoices :fraction`,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues
            }
        };
    });
};