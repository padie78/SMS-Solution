import { TABLE_NAME } from "./client.js";

export const buildStatsOps = (PK, timeData, metrics, isoNow) => {
    const { year, quarter, month, week, day } = timeData;
    const { nCo2e, nSpend, vCons, uCons, svc } = metrics;

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
        const isTon = ['ANNUAL', 'QUARTERLY', 'MONTHLY'].includes(type);
        const co2Val = isTon ? (nCo2e / 1000) : nCo2e;
        const co2Field = isTon ? 'total_co2e_ton' : 'total_co2e_kg';

        // --- Definición de Cláusulas SET por Nivel ---
        let setClauses = [
            `entity_type = :type`,
            `last_updated = :now`,
            `financials = if_not_exists(financials, :emptyMap)`,
            `ghg_inventory = if_not_exists(ghg_inventory, :emptyMap)`,
            `consumption_mix = if_not_exists(consumption_mix, :emptyMap)`,
            `consumption_mix.#svc = if_not_exists(consumption_mix.#svc, :emptyMap)`,
            `consumption_mix.#svc.#u_field = :uCons`,
            `trazabilidad = if_not_exists(trazabilidad, :emptyMap)`
        ];

        // 1. ANUAL, TRIMESTRAL y MENSUAL: Reporting, KPIs de normalización e impacto
        if (isTon) {
            setClauses.push(`metadata = if_not_exists(metadata, :defaultMeta)`);
            setClauses.push(`normalization_kpis = if_not_exists(normalization_kpis, :emptyMap)`);
            setClauses.push(`environmental_impact = if_not_exists(environmental_impact, :emptyMap)`);
            setClauses.push(`weather_adjustment = if_not_exists(weather_adjustment, :emptyMap)`);
        }

        // 2. SEMANAL: Foco en performance y eficiencia operativa
        if (type === 'WEEKLY') {
            setClauses.push(`performance_kpis = if_not_exists(performance_kpis, :emptyMap)`);
            setClauses.push(`environmental_impact = if_not_exists(environmental_impact, :emptyMap)`);
        }

        // 3. DIARIO: Ingeniería de planta, activos y distribución horaria
        if (type === 'DAILY') {
            setClauses.push(`distribution_map = if_not_exists(distribution_map, :emptyMap)`);
            setClauses.push(`engineering_kpis = if_not_exists(engineering_kpis, :emptyMap)`);
            setClauses.push(`asset_health = if_not_exists(asset_health, :emptyMap)`);
        }

        return {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: sk },
                UpdateExpression: `
                    SET ${setClauses.join(', ')}
                    ADD 
                        financials.total_spend :nSpend,
                        ghg_inventory.${co2Field} :nCo2,
                        consumption_mix.#svc.#v_field :vCons,
                        consumption_mix.#svc.spend :nSpend,
                        trazabilidad.total_invoices_processed :one
                `,
                ExpressionAttributeNames: {
                    "#svc": svc,
                    "#u_field": "unit",
                    "#v_field": "val"
                },
                ExpressionAttributeValues: {
                    ":type": `${type}_METRICS`,
                    ":nSpend": Number(nSpend),
                    ":nCo2": Number(co2Val),
                    ":vCons": Number(vCons),
                    ":uCons": uCons,
                    ":one": 1,
                    ":now": isoNow,
                    ":emptyMap": {},
                    ":defaultMeta": { version: "1.0", is_fiscal_closed: false }
                }
            }
        };
    });
};