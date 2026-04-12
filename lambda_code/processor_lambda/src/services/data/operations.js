import { TABLE_NAME } from "./client.js";

export const buildStatsOps = (PK, SK, aggregatedData, unit, svc, isoNow) => {
    const { nSpend, nCo2e, vCons, count, type } = aggregatedData;
    
    const isHighLevel = ['ANNUAL', 'QUARTERLY', 'MONTHLY'].includes(type);
    const co2Field = isHighLevel ? 'ghg_total_co2e_ton' : 'ghg_total_co2e_kg';
    const co2Val = isHighLevel ? (nCo2e / 1000) : nCo2e; 

    // 1. Atributos base (siempre se usan)
    const attrNames = {
        "#svc_u": `consumption_${svc}_unit`,
        "#svc_v": `consumption_${svc}_val`,
        "#svc_s": `consumption_${svc}_spend`
    };

    const attrValues = {
        ":type": `${type}_METRICS`,
        ":nSpend": Number(nSpend.toFixed(4)),
        ":nCo2": Number(co2Val.toFixed(6)),
        ":vCons": Number(vCons.toFixed(4)),
        ":uCons": unit,
        ":fraction": Number(count.toFixed(8)),
        ":now": isoNow
    };

    let setClauses = [
        `entity_type = :type`,
        `last_updated = :now`,
        `#svc_u = :uCons`
    ];

    // 2. Lógica condicional estricta para Metadatos
    if (isHighLevel) {
        setClauses.push(`metadata = if_not_exists(metadata, :defaultMeta)`);
        attrValues[":defaultMeta"] = { version: "1.0", is_fiscal_closed: false };
    }

    // 3. Lógica condicional estricta para KPIs de ingeniería/performance
    if (type === 'DAILY') {
        setClauses.push(`engineering_kpis = if_not_exists(engineering_kpis, :emptyMap)`);
        attrValues[":emptyMap"] = {};
    } 
    
    if (type === 'WEEKLY') {
        setClauses.push(`performance_kpis = if_not_exists(performance_kpis, :emptyMap)`);
        attrValues[":emptyMap"] = {};
    }

    return {
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK },
            UpdateExpression: `SET ${setClauses.join(', ')} ADD financials_total_spend :nSpend, ${co2Field} :nCo2, #svc_v :vCons, #svc_s :nSpend, trazabilidad_total_invoices :fraction`,
            ExpressionAttributeNames: attrNames,
            ExpressionAttributeValues: attrValues
        }
    };
};