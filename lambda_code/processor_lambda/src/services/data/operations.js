import { TABLE_NAME } from "./client.js";

/**
 * @fileoverview Generador de comandos de Update para DynamoDB.
 * Recibe datos ya consolidados para evitar duplicidad de operaciones sobre el mismo SK.
 */
export const buildStatsOps = (PK, SK, aggregatedData, unit, svc, isoNow) => {
    const { nSpend, nCo2e, vCons, count, type } = aggregatedData;
    
    // 1. Lógica de escala: Toneladas para niveles ejecutivos, Kg para detalle operativo
    const isHighLevel = ['ANNUAL', 'QUARTERLY', 'MONTHLY'].includes(type);
    const co2Val = isHighLevel ? (nCo2e / 1000) : nCo2e;
    const co2Field = isHighLevel ? 'ghg_total_co2e_ton' : 'ghg_total_co2e_kg';

    // 2. Mapeo dinámico de nombres de columnas según el servicio (gas, electricity, etc.)
    const attrNames = {
        "#svc_u": `consumption_${svc}_unit`,
        "#svc_v": `consumption_${svc}_val`,
        "#svc_s": `consumption_${svc}_spend`
    };

    const attrValues = {
        ":type": `${type}_METRICS`,
        ":nSpend": Number(nSpend.toFixed(4)), // Evitamos problemas de precisión decimal
        ":nCo2": Number(co2Val.toFixed(6)),
        ":vCons": Number(vCons.toFixed(4)),
        ":uCons": unit,
        ":fraction": Number(count.toFixed(8)), // La suma de fracciones debe ser 1
        ":now": isoNow,
        ":defaultMeta": { version: "1.0", is_fiscal_closed: false }
    };

    let setClauses = [
        `entity_type = :type`,
        `last_updated = :now`,
        `#svc_u = :uCons`
    ];

    // 3. Inicialización de metadatos solo para registros de alto nivel
    if (isHighLevel) {
        setClauses.push(`metadata = if_not_exists(metadata, :defaultMeta)`);
    }

    return {
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK },
            UpdateExpression: `
                SET ${setClauses.join(', ')}
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
};