#!/bin/bash

# --- CONFIGURACIÓN ---
REGION="eu-central-1"
CLIENT_ID="3fd0buanhinsiofrq03kavj2mi"
APPSYNC_URL="https://75nymxzbp5dddnsnehigmroili.appsync-api.eu-central-1.amazonaws.com/graphql"

D_USER="diego_liascovich"
D_PASS="DLpdp1980!"

ORG_ID="f3d4f8a2-90c1-708c-a446-2c8592524d62"
BRANCH_ID="BR-PLANT-001"
CC_ID="CC-PROD-01"
PERIOD="2026-04" # Consistencia en el periodo de test

echo "🔑 Obteniendo Token..."
ID_TOKEN=$(aws cognito-idp initiate-auth --region "$REGION" --auth-flow USER_PASSWORD_AUTH --client-id "$CLIENT_ID" --auth-parameters USERNAME="$D_USER",PASSWORD="$D_PASS" --query 'AuthenticationResult.IdToken' --output text)

call_appsync() {
    local QUERY=$1
    local LABEL=$2
    echo "📡 $LABEL..."
    local PAYLOAD=$(jq -n --arg q "$QUERY" '{query: $q}')
    curl -s -X POST "$APPSYNC_URL" -H "Authorization: $ID_TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD" | jq .
}

# --- 1. ORGANIZACIÓN ---
QUERY_ORG="mutation { saveOrgConfig(input: { orgId: \"$ORG_ID\", name: \"SMS Be'er Sheva\", taxId: \"ISR-123\", hqAddress: \"South District\", gasConversion: 10.55, currency: \"ILS\" }) { success } }"
call_appsync "$QUERY_ORG" "1. Configuración Org"

# --- 2. CENTRO DE COSTOS ---
QUERY_CC="mutation { saveCostCenter(input: { orgId: \"$ORG_ID\", id: \"$CC_ID\", name: \"Línea Silo B\", accountingCode: \"700-001\", monthlyBudget: 50000.0 }) { success id } }"
call_appsync "$QUERY_CC" "2. Creación CC"

# --- 3. TARIFA ---
QUERY_TARIFF="mutation { saveUtilityTariff(input: { branchId: \"$BRANCH_ID\", providerName: \"IEC\", serviceType: \"ELECTRICITY\", unitRate: 0.58, currency: \"ILS\" }) { success } }"
call_appsync "$QUERY_TARIFF" "3. Tarifa"

# --- 4. ASSET ---
QUERY_ASSET="mutation { createAsset(input: { name: \"Compresor B1\", type: \"MOTOR\", branchId: \"$BRANCH_ID\", costCenterId: \"$CC_ID\", climatiqId: \"elec-supply\", unitType: \"kWh\" }) { success id } }"
call_appsync "$QUERY_ASSET" "4. Activo"

# --- 5. PRODUCCIÓN ---
QUERY_PROD="mutation { logProduction(input: { branchId: \"$BRANCH_ID\", period: \"$PERIOD\", unitsProduced: 1250.0, unitType: \"TONS\" }) { success } }"
call_appsync "$QUERY_PROD" "5. Producción"

# --- 5.5 CARGA DE FACTURA (NUEVO - REQUERIDO) ---
# Esto genera el registro READING#INV# que luego aprobaremos
QUERY_LOAD_INV="mutation {
  saveInvoiceReading(input: {
    branchId: \"$BRANCH_ID\",
    period: \"$PERIOD\",
    invoiceNumber: \"INV-2026-X88\",
    amount: 15400.50,
    consumption: 25000.0,
    currency: \"ILS\"
  }) { success id }
}"
call_appsync "$QUERY_LOAD_INV" "5.5 Generando Lectura de Factura (Base para aprobación)"

# --- 6. APROBACIÓN ---
# Ahora el invoiceId coincide con el ID generado en el paso anterior
QUERY_APPROVE="mutation {
  approveInvoice(invoiceId: \"READING#INV#$PERIOD#$BRANCH_ID\") {
    id
    status
    approvedBy
    approvedAt
  }
}"
call_appsync "$QUERY_APPROVE" "6. Aprobación (Audit Flow)"

echo "✅ Test Finalizado."