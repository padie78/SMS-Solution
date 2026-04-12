import { TABLE_NAME } from "./client.js";

/**
 * buildStatsOps - Generador de operaciones atómicas para DynamoDB.
 * Integra estándares: GHG Protocol, ISO 14064, GRI 302/305, TCFD y SASB.
 */
export const buildStatsOps = (PK, SK, aggregatedData, unit, svc, isoNow) => {
    const { nSpend, nCo2e, vCons, count, type } = aggregatedData;
    
    // 1. Lógica de Escala y Unidades (Norma ISO 14064)
    // Determinamos si es un nivel de reporte (High) o de detalle (Daily/Weekly)
    const isHighLevel = ['ANNUAL', 'QUARTERLY', 'MONTHLY'].includes(type) || SK.includes('FACILITY');
    const co2Field = isHighLevel ? 'ghg_total_co2e_ton' : 'ghg_total_co2e_kg';
    
    // El valor base nCo2e viene en KG del prorrateo. Convertimos a Ton si es High Level.
    const co2Val = isHighLevel ? (nCo2e / 1000) : nCo2e; 

    // 2. Mapeo Dinámico de Atributos (Evita colisiones entre servicios como Gas/Luz)
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
        ":emptyList": [],
        ":logEntry": [{
            ts: isoNow,
            ev: "DATA_PRORATION_SYNC",
            co2: Number(co2Val.toFixed(6)),
            src: "OCR_PIPELINE_V1",
            engine: "CALC_ENGINE_V2.1"
        }]
    };

    let setClauses = [
        `entity_type = :type`,
        `last_updated = :now`,
        `#svc_u = :uCons`,
        `#audit = list_append(if_not_exists(#audit, :emptyList), :logEntry)`
    ];

    // --- BLOQUE A: NIVEL OPERATIVO (DAILY / WEEKLY) ---
    // Foco en Eficiencia Técnica y Detección de Anomalías
    if (type === 'DAILY' || type === 'WEEKLY') {
        setClauses.push(`engineering_metrics = :eng`);
        attrValues[":eng"] = {
            energy_intensity: vCons > 0 ? Number((nCo2e / vCons).toFixed(6)) : 0,
            is_anomaly: false,
            performance_kpis: {} // Placeholder para integraciones IoT
        };
    }

    // --- BLOQUE B: NIVEL DE GESTIÓN (MONTHLY / QUARTERLY) ---
    // Foco en Cumplimiento de Metas y Reporting GRI
    if (type === 'MONTHLY' || type === 'QUARTERLY') {
        setClauses.push(`management_reporting = :mgmt`);
        attrValues[":mgmt"] = {
            carbon_intensity_revenue: nSpend > 0 ? Number((co2Val / nSpend).toFixed(6)) : 0,
            budget_utilization_pct: 0, 
            reporting_period_status: "OPEN"
        };
    }

    // --- BLOQUE C: NIVEL ESTRATÉGICO Y CUMPLIMIENTO (ANNUAL / FACILITY) ---
    // Foco en Auditoría, Riesgo TCFD y Metodología ISO
    if (isHighLevel) {
        // 1. Motor Predictivo y Riesgo
        setClauses.push(`predictive_engine = if_not_exists(predictive_engine, :pred)`);
        attrValues[":pred"] = {
            forecast_year_end_co2: 0,
            target_annual_limit: 48.0, 
            financial_risk_exposure: Number((co2Val * 85).toFixed(2)) // Carbon Tax baseline
        };

        // 2. Regulatory Compliance (GHG Protocol / ISO)
        setClauses.push(`regulatory_compliance = :comp`);
        attrValues[":comp"] = {
            scope_category: "SCOPE_2_INDIRECT",
            methodology: "GHG_PROTOCOL_2024",
            data_quality_score: count >= 1 ? "VERIFIED" : "ESTIMATED",
            reporting_standard: "ISO_14064_1"
        };

        // 3. Advanced Analytics (GRI 302-3, TCFD Scenario Analysis)
        attrValues[":advanced"] = {
            // Intensidad Energética (GRI)
            energy_intensity_index: vCons > 0 ? Number((vCons / nSpend).toFixed(4)) : 0, 

            // Análisis de Escenarios de Riesgo (TCFD)
            transition_risk_scoring: {
                carbon_tax_high_scenario: Number((co2Val * 150).toFixed(2)), // Escenario pesimista $150/ton
                carbon_tax_low_scenario: Number((co2Val * 45).toFixed(2)),   // Escenario optimista $45/ton
            },

            // Resource Management (SASB)
            renewable_energy_mix_pct: 0, 
            
            // Trazabilidad de Factores
            emission_factor_source: "CLIMATIQ_LATEST_IPCC",
            last_methodology_review: "2026-01-01"
        };
        setClauses.push(`advanced_analytics = :advanced`);

        // Metadatos de control fiscal
        attrValues[":defaultMeta"] = { version: "1.1", is_fiscal_closed: false };
        setClauses.push(`metadata = if_not_exists(metadata, :defaultMeta)`);
    }

    // 4. Ejecución de la Operación (Atómica)
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