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
        const isHighLevel = ['ANNUAL', 'QUARTERLY', 'MONTHLY'].includes(type);
        const co2Val = isHighLevel ? (nCo2e / 1000) : nCo2e;
        const co2Field = isHighLevel ? 'total_co2e_ton' : 'total_co2e_kg';

        const attrNames = {
            "#svc": svc,
            "#u_field": "unit",
            "#v_field": "val",
            "#fin": "financials",
            "#ghg": "ghg_inventory",
            "#mix": "consumption_mix",
            "#traz": "trazabilidad"
        };

        // --- BLOQUE SET: Solo campos que NO colisionan con los ADD ---
        let setExpressions = [
            "entity_type = :type",
            "last_updated = :now",
            // Inicializamos el objeto del servicio específico
            "#mix.#svc = if_not_exists(#mix.#svc, :emptyMap)",
            "#mix.#svc.#u_field = :uCons"
        ];

        if (isHighLevel) {
            attrNames["#meta"] = "metadata";
            attrNames["#norm"] = "normalization_kpis";
            attrNames["#env"] = "environmental_impact";
            attrNames["#weat"] = "weather_adjustment";
            setExpressions.push("#meta = if_not_exists(#meta, :defaultMeta)");
            setExpressions.push("#norm = if_not_exists(#norm, :emptyMap)");
            setExpressions.push("#env = if_not_exists(#env, :emptyMap)");
            setExpressions.push("#weat = if_not_exists(#weat, :emptyMap)");
        }

        if (type === 'WEEKLY') {
            attrNames["#perf"] = "performance_kpis";
            setExpressions.push("#perf = if_not_exists(#perf, :emptyMap)");
        }

        if (type === 'DAILY') {
            attrNames["#dist"] = "distribution_map";
            attrNames["#eng"] = "engineering_kpis";
            attrNames["#ast"] = "asset_health";
            setExpressions.push("#dist = if_not_exists(#dist, :emptyMap)");
            setExpressions.push("#eng = if_not_exists(#eng, :emptyMap)");
            setExpressions.push("#ast = if_not_exists(#ast, :emptyMap)");
        }

        return {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: sk },
                // CLAVE: No usamos SET para inicializar los mapas padres (#fin, #ghg, #traz).
                // En su lugar, DynamoDB permite que el ADD cree el path si el padre no existe (en la mayoría de los casos)
                // O usamos SET con un path específico que no colisione.
                UpdateExpression: `
                    SET ${setExpressions.join(', ')}
                    ADD 
                        #fin.total_spend :nSpend,
                        #ghg.${co2Field} :nCo2,
                        #mix.#svc.#v_field :vCons,
                        #traz.total_invoices_processed :one
                `,
                ExpressionAttributeNames: attrNames,
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