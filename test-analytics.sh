#!/bin/bash

# --- CONFIGURACIÓN ---
REGION="eu-central-1"
CLIENT_ID="5uomoc3mlgo6h1cgk76j4pemja"
APPSYNC_URL="https://75nymxzbp5dddnsnehigmroili.appsync-api.eu-central-1.amazonaws.com/graphql"

D_USER="diego_liascovich"
D_PASS="DLpdp1980!"

echo -e "\033[1;33m🔑 Obteniendo Token de Cognito...\033[0m"
ID_TOKEN=$(aws cognito-idp initiate-auth \
    --region "$REGION" \
    --auth-flow USER_PASSWORD_AUTH \
    --client-id "$CLIENT_ID" \
    --auth-parameters USERNAME="$D_USER",PASSWORD="$D_PASS" \
    --query 'AuthenticationResult.IdToken' \
    --output text)

if [ "$ID_TOKEN" == "None" ] || [ -z "$ID_TOKEN" ]; then
    echo -e "\033[1;31m❌ Error al obtener el token. Revisa las credenciales.\033[0m"
    exit 1
fi

call_appsync() {
    local QUERY=$1
    local LABEL=$2
    echo -e "\n\033[1;34m--- $LABEL ---\033[0m"
    local PAYLOAD=$(jq -n --arg q "$QUERY" '{query: $q}')
    curl -s -X POST "$APPSYNC_URL" \
        -H "Authorization: $ID_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" | jq .
}

# --- 1. KPI MENSUAL (Original - Plano) ---
QUERY_MONTHLY="query {
  getPrecalculatedKPI(year: \"2026\", month: \"3\") {
    id
    metadata {
      orgId
      year
      month
      granularity
      lastUpdated
    }
    financials_total_spend
    cost_per_m2
    budget_deviation_pct
    ghg_total_co2e_ton
    ghg_total_co2e_kg
    target_deviation_pct
    energy_intensity_index
    energy_intensity_per_m2
    predictive_engine {
      forecast_year_end_co2
      target_annual_limit
      projected_gap_vs_target
    }
    advanced_analytics {
      data_quality_score
      emission_factor_source
    }
    management_reporting {
      carbon_intensity_revenue
      reporting_period_status
    }
    sourceData
  }
}"

# --- 2. KPI SEMANAL (Corregido: week como String) ---
QUERY_WEEKLY="query {
  getPrecalculatedKPI(year: \"2026\", week: \"15\") {
    id
    metadata {
      orgId
      year
      granularity
    }
    financials_total_spend
    ghg_total_co2e_ton
    ghg_total_co2e_kg
    energy_intensity_index
    predictive_engine {
      forecast_year_end_co2
    }
    sourceData
  }
}"

# --- 3. KPI DIARIO (Corregido: day como String) ---
QUERY_DAILY="query {
  getPrecalculatedKPI(year: \"2026\", month: \"4\", day: \"21\") {
    id
    metadata {
      granularity
    }
    financials_total_spend
    ghg_total_co2e_ton
    energy_intensity_index
  }
}"

# --- 4. KPI CUATRIMESTRAL (Plano) ---
QUERY_QUARTERLY="query {
  getPrecalculatedKPI(year: \"2026\", quarter: \"Q2\") {
    id
    metadata {
      granularity
    }
    financials_total_spend
    budget_deviation_pct
    ghg_total_co2e_ton
    target_deviation_pct
  }
}"

# --- 5. KPI ANUAL (Original - Plano) ---
QUERY_ANNUAL="query {
  getPrecalculatedKPI(year: \"2026\") {
    id
    metadata {
      orgId
      year
      granularity
    }
    financials_total_spend
    ghg_total_co2e_ton
    predictive_engine {
      forecast_year_end_co2
    }
  }
}"

# Ejecución
call_appsync "$QUERY_MONTHLY" "1. ANÁLISIS MENSUAL (Abril)"
call_appsync "$QUERY_WEEKLY" "2. ANÁLISIS OPERATIVO (SEMANAL W15)"
call_appsync "$QUERY_DAILY" "3. ANÁLISIS DIARIO (21-Abr)"
call_appsync "$QUERY_QUARTERLY" "4. ANÁLISIS CUATRIMESTRAL (Q2)"
call_appsync "$QUERY_ANNUAL" "5. ANÁLISIS ANUAL (2026)"

echo -e "\n\033[1;32m✅ Suite de Pruebas Finalizada para Energy Intelligence System.\033[0m"