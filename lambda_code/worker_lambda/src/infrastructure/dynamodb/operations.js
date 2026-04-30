import { TABLE_NAME } from "./client.js";

/**
 * buildStatsOps - Generador de operaciones atómicas para DynamoDB.
 * Incluye cálculos dinámicos de Forecast (SBTi) y análisis de riesgo TCFD.
 */
export const buildStatsOps = (PK, SK, aggregatedData, unit, svc, isoNow) => {
  const { nSpend, nCo2e, vCons, count, type } = aggregatedData;
  const now = new Date(isoNow);

  const isHighLevel = ["ANNUAL", "QUARTERLY", "MONTHLY"].includes(type) || SK.includes("FACILITY");
  const co2Field = isHighLevel ? "ghg_total_co2e_ton" : "ghg_total_co2e_kg";
  const co2Val = isHighLevel ? nCo2e / 1000 : nCo2e;

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const diffInMs = now - startOfYear;
  const dayOfYear = Math.max(1, Math.floor(diffInMs / (1000 * 60 * 60 * 24)));
  const forecast = isHighLevel ? Number(((co2Val / dayOfYear) * 365).toFixed(2)) : 0;

  const attrNames = {
    "#svc_u": `consumption_${svc}_unit`,
    "#svc_v": `consumption_${svc}_val`,
    "#svc_s": `consumption_${svc}_spend`,
    "#audit": "audit_trail"
  };

  const attrValues = {
    ":type": `${type}_METRICS`,
    ":nSpend": Number(nSpend.toFixed(4)),
    ":nCo2": Number(co2Val.toFixed(6)),
    ":vCons": Number(vCons.toFixed(4)),
    ":uCons": unit,
    ":fraction": Number(count.toFixed(8)),
    ":now": isoNow,
    ":emptyList": [],
    ":logEntry": [
      {
        ts: isoNow,
        ev: "DATA_PRORATION_SYNC",
        co2: Number(co2Val.toFixed(6)),
        src: "OCR_PIPELINE_V1",
        engine: "CALC_ENGINE_V2.5_PRO"
      }
    ]
  };

  let setClauses = [
    `entity_type = :type`,
    `last_updated = :now`,
    `#svc_u = :uCons`,
    `#audit = list_append(if_not_exists(#audit, :emptyList), :logEntry)`
  ];

  if (type === "DAILY" || type === "WEEKLY") {
    setClauses.push(`engineering_metrics = :eng`);
    attrValues[":eng"] = {
      energy_intensity: vCons > 0 ? Number((nCo2e / vCons).toFixed(6)) : 0,
      is_anomaly: false
    };
  }

  if (isHighLevel) {
    if (type === "MONTHLY" || type === "QUARTERLY") {
      setClauses.push(`management_reporting = :mgmt`);
      attrValues[":mgmt"] = {
        carbon_intensity_revenue: nSpend > 0 ? Number((co2Val / nSpend).toFixed(6)) : 0,
        reporting_period_status: "OPEN"
      };
    }

    const targetLimit = 48.0;
    setClauses.push(`predictive_engine = :pred`);
    attrValues[":pred"] = {
      forecast_year_end_co2: forecast,
      target_annual_limit: targetLimit,
      financial_risk_exposure: Number((co2Val * 85).toFixed(2)),
      current_vs_target_pct: Number(((co2Val / targetLimit) * 100).toFixed(2))
    };

    setClauses.push(`advanced_analytics = :advanced`);
    attrValues[":advanced"] = {
      energy_intensity_index: vCons > 0 ? Number((vCons / nSpend).toFixed(4)) : 0,
      transition_risk_scoring: {
        carbon_tax_high_scenario: Number((co2Val * 150).toFixed(2)),
        carbon_tax_low_scenario: Number((co2Val * 45).toFixed(2))
      },
      renewable_energy_mix_pct: 0,
      emission_factor_source: "CLIMATIQ_LATEST_IPCC",
      data_quality_score: count >= 1 ? "VERIFIED" : "ESTIMATED"
    };

    setClauses.push(`regulatory_compliance = :comp`);
    attrValues[":comp"] = {
      scope_category: "SCOPE_2_INDIRECT",
      methodology: "GHG_PROTOCOL_2024",
      reporting_standard: "ISO_14064_1"
    };

    attrValues[":defaultMeta"] = { version: "1.2", is_fiscal_closed: false };
    setClauses.push(`metadata = if_not_exists(metadata, :defaultMeta)`);
  }

  return {
    Update: {
      TableName: TABLE_NAME,
      Key: { PK, SK },
      UpdateExpression: `
                SET ${setClauses.join(", ")} 
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

