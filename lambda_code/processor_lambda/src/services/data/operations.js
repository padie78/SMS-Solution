import { TABLE_NAME } from "../database/client.js";

export const buildStatsOps = (PK, timeData, metrics, isoNow) => {
    const { year, quarter, month, week, day } = timeData;
    const { nCo2e, nSpend, vCons, uCons, svc } = metrics;

    // Formateo con padding para asegurar orden alfabético en DynamoDB
    const m = month.toString().padStart(2, '0');
    const w = week.toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const q = quarter.toString();

    // La jerarquía que definimos
    const targets = [
        { sk: `STATS#YEAR#${year}#TOTAL`, type: 'ANNUAL' },
        { sk: `STATS#YEAR#${year}#PERIOD#${q}#TOTAL`, type: 'QUARTERLY' },
        { sk: `STATS#YEAR#${year}#PERIOD#${q}#MONTH#${m}#TOTAL`, type: 'MONTHLY' },
        { sk: `STATS#YEAR#${year}#PERIOD#${q}#MONTH#${m}#WEEK#${w}#TOTAL`, type: 'WEEKLY' },
        { sk: `STATS#YEAR#${year}#PERIOD#${q}#MONTH#${m}#WEEK#${w}#DAY#${d}`, type: 'DAILY' }
    ];

    return targets.map(({ sk, type }) => ({
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: sk },
            UpdateExpression: `
                SET entity_type = :type,
                    last_updated = :now,
                    financials.total_spend = if_not_exists(financials.total_spend, :zero) + :nSpend,
                    ghg_inventory.total_co2e_ton = if_not_exists(ghg_inventory.total_co2e_ton, :zero) + :nTon,
                    consumption_mix.${svc}.val = if_not_exists(consumption_mix.${svc}.val, :zero) + :vCons,
                    consumption_mix.${svc}.unit = :uCons,
                    trazabilidad.total_invoices_processed = if_not_exists(trazabilidad.total_invoices_processed, :zero) + :one
            `,
            ExpressionAttributeValues: {
                ":type": `${type}_METRICS`,
                ":nSpend": Number(nSpend) || 0,
                ":nTon": (Number(nCo2e) || 0) / 1000,
                ":vCons": Number(vCons) || 0,
                ":uCons": uCons || "N/A",
                ":one": 1,
                ":zero": 0,
                ":now": isoNow
            }
        }
    }));
};