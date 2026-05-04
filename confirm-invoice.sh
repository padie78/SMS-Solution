#!/bin/bash

# --- CONFIGURACIÓN ---
REGION="eu-central-1"
CLIENT_ID="5uomoc3mlgo6h1cgk76j4pemja"
APPSYNC_URL="https://75nymxzbp5dddnsnehigmroili.appsync-api.eu-central-1.amazonaws.com/graphql"

D_USER="diego_liascovich"
D_PASS="DLpdp1980!"

ORG_ID="f3d4f8a2-90c1-708c-a446-2c8592524d62"
INVOICE_SK="INV#ELECTRICITY#A12345678#20260403001"

echo "🔑 Obteniendo Token..."
ID_TOKEN=$(aws cognito-idp initiate-auth --region "$REGION" --auth-flow USER_PASSWORD_AUTH --client-id "$CLIENT_ID" --auth-parameters USERNAME="$D_USER",PASSWORD="$D_PASS" --query 'AuthenticationResult.IdToken' --output text)

call_appsync() {
    local QUERY=$1  # <--- CORREGIDO: Eliminada la 's'
    local LABEL=$2
    echo "📡 $LABEL..."
    # Usamos jq para escapar correctamente los saltos de línea y comillas de la query
    local PAYLOAD=$(jq -n --arg q "$QUERY" '{query: $q}')
    
    curl -s -X POST "$APPSYNC_URL" \
        -H "Authorization: $ID_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" | jq .
}

# --- 6. CONFIRMACIÓN TÉCNICA ---
# Corregido service_type: "ELECTRICITY"
QUERY_CONFIRM="mutation {
  confirmInvoice(
    sk: \"$INVOICE_SK\",
    input: {
      service_type: \"ELECTRICITY\",
      total_magnitude_sum: 370.5,
      billing_period: {
        start: \"2026-03-01\",
        end: \"2026-03-31\"
      },
      extracted_data: {
        vendor_name: \"ELECTRA NOVA\",
        vendor_tax_id: \"A-12345678\",
        invoice_number: \"20260403-001\",
        total_amount: 80.07,
        currency: \"EUR\"
      }
    }
  ) {
    success
    message
  }
}"

call_appsync "$QUERY_CONFIRM" "6. Confirmación con Data Validada"

echo "✅ Test de Flujo de Facturación Finalizado."