import { TABLE_NAME } from "./client.js";

/**
 * @fileoverview Generador de operaciones de actualización para DynamoDB con cumplimiento normativo.
 * Implementa estándares de GHG Protocol (Scope 2) y GRI 302/305.
 */
export const buildStatsOps = (PK, SK, aggregatedData, unit, svc, isoNow) => {
    const { nSpend, nCo2e, vCons, count, type } = aggregatedData;
    
    // 1. Lógica de Escala y Unidades (Norma ISO 14064)
    const isHighLevel = ['ANNUAL', 'QUARTERLY', 'MONTHLY'].includes(type) || SK.includes('FACILITY');
    const co2Field = isHighLevel ? 'ghg_total_co2e_ton' : 'ghg_total_co2e_kg';
    const co2Val = isHighLevel ? (nCo2e / 1000) : nCo2e; 

    // 2. Mapeo Dinámico de Atributos (Clean Architecture)
    const attrNames = {
        "#svc_u": `consumption_${svc}_unit`,
        "#svc_v": `consumption_${svc}_val`,
        "#svc_s": `consumption_${svc}_spend`,
        "#audit": "audit_trail"
    };

    // 3. Valores Base de la Transacción
    const attrValues = {
        ":type": `${type}_METRICS`,
        ":nSpend": Number(nSpend.toFixed(4)),
        ":nCo2": Number(co2Val.toFixed(6)),
        ":vCons": Number(vCons.toFixed(4)),
        ":uCons": unit,
        ":fraction": Number(count.toFixed(8)),
        ":now": isoNow,
        ":emptyList": []
    };

    let setClauses = [
        `entity_type = :type`,
        `last_updated = :now`,
        `#svc_u = :uCons`,
        `#audit = list_append(if_not_exists(#audit, :emptyList), :logEntry)`
    ];

    attrValues[":logEntry"] = [{
        ts: isoNow,
        ev: "DATA_PRORATION",
        co2: Number(co2Val.toFixed(6)),
        src: "OCR_PIPELINE_V1"
    }];

    // --- BLOQUE DE KPIs PROFESIONALES SEGÚN GRANULARIDAD ---

    // A. NIVEL OPERATIVO (DAILY/WEEKLY): Foco en Eficiencia Técnica e Ingeniería
    if (type === 'DAILY' || type === 'WEEKLY') {
        setClauses.push(`engineering_metrics = :eng`);
        attrValues[":eng"] = {
            energy_intensity: vCons > 0 ? Number((nCo2e / vCons).toFixed(6)) : 0, // CO2 / Consumo
            efficiency_index: nSpend > 0 ? Number((vCons / nSpend).toFixed(4)) : 0, // Consumo / Costo
            is_anomaly: false,
            performance_kpis: {} // Placeholder para datos de sensores IoT futuros
        };
    }

    // B. NIVEL TÁCTICO (MONTHLY): Foco en Gestión Financiera y GRI
    if (type === 'MONTHLY') {
        setClauses.push(`management_reporting = :mgmt`);
        attrValues[":mgmt"] = {
            carbon_intensity_revenue: nSpend > 0 ? Number((co2Val / nSpend).toFixed(6)) : 0, // Estándar GRI
            budget_utilization_pct: 0, // Se llena con datos de presupuesto organizacional
            reporting_period_status: "OPEN"
        };
    }

    // C. NIVEL ESTRATÉGICO (ANNUAL/FACILITY): Foco en Riesgo y Compliance (TCFD/GHG)
    if (isHighLevel && (type === 'ANNUAL' || SK.includes('FACILITY'))) {
        setClauses.push(`predictive_engine = if_not_exists(predictive_engine, :pred)`);
        setClauses.push(`regulatory_compliance = :comp`);
        
        attrValues[":pred"] = {
            forecast_year_end_co2: 0,
            target_annual_limit: 48.0, // Configurable por política de la empresa
            financial_risk_exposure: Number((co2Val * 85).toFixed(2)) // Basado en Carbon Tax promedio
        };

        attrValues[":comp"] = {
            scope_category: "SCOPE_2_INDIRECT",
            methodology: "GHG_PROTOCOL_2024",
            data_quality_score: count >= 1 ? "VERIFIED" : "ESTIMATED",
            reporting_standard: "ISO_14064_1"
        };

        attrValues[":defaultMeta"] = { version: "1.0", is_fiscal_closed: false };
        setClauses.push(`metadata = if_not_exists(metadata, :defaultMeta)`);
    }

    // 4. Construcción del comando final
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