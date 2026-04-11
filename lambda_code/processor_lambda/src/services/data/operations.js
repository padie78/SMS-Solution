import { TABLE_NAME } from "./client.js";
import { calculateSMSMetrics } from "../../utils/analytics.js"; // Importamos tu archivo de lógica

export const buildStatsOps = (PK, timeData, metrics, isoNow, orgSettings = {}) => {
    const { year, quarter, month, week, day } = timeData;
    const { nCo2e, nSpend, vCons, uCons, svc } = metrics;

    // 1. Ejecutamos tus cálculos externos
    const kpis = calculateSMSMetrics(metrics, orgSettings);

    const m = `M${month.toString().padStart(2, '0')}`;
    const w = `W${week.toString().padStart(2, '0')}`;
    const q = `Q${quarter}`;

    const targets = [
        { sk: `STATS#YEAR#${year}`, type: 'ANNUAL' },
        { sk: `STATS#YEAR#${year}#${q}`, type: 'QUARTERLY' },
        { sk: `STATS#YEAR#${year}#${m}`, type: 'MONTHLY' },
        { sk: `STATS#WEEK#${year}#${w}`, type: 'WEEKLY' },
        { sk: `STATS#DAY#${day}`, type: 'DAILY' }
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
            ":one": 1,
            ":now": isoNow,
            ":norm": kpis.normalization, // Mapeo directo de tu objeto
            ":env": kpis.environmental,   // Mapeo directo de tu objeto
            ":weat": kpis.weather        // Mapeo directo de tu objeto
        };

        let setClauses = [
            `entity_type = :type`,
            `last_updated = :now`,
            `#svc_u = :uCons`,
            `normalization_kpis = :norm`,
            `environmental_impact = :env`,
            `weather_adjustment = :weat`
        ];

        // Manejo estricto de :emptyMap para evitar el error anterior
        if (type === 'WEEKLY' || type === 'DAILY') {
            attrValues[":emptyMap"] = {};
        }

        if (isHighLevel) {
            setClauses.push(`metadata = if_not_exists(metadata, :defaultMeta)`);
            attrValues[":defaultMeta"] = { version: "1.0", is_fiscal_closed: false };
        }

        if (type === 'WEEKLY') {
            setClauses.push(`performance_kpis = if_not_exists(performance_kpis, :emptyMap)`);
        }

        if (type === 'DAILY') {
            setClauses.push(`engineering_kpis = if_not_exists(engineering_kpis, :emptyMap)`);
            setClauses.push(`asset_health = if_not_exists(asset_health, :emptyMap)`);
            setClauses.push(`distribution_map = if_not_exists(distribution_map, :emptyMap)`);
        }

        return {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: sk },
                UpdateExpression: `
                    SET ${setClauses.join(', ')}
                    ADD 
                        financials_total_spend :nSpend,
                        ${co2Field} :nCo2,
                        #svc_v :vCons,
                        #svc_s :nSpend,
                        trazabilidad_total_invoices :one
                `,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues
            }
        };
    });
};