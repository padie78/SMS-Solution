#!/bin/bash

# --- CONFIGURACIÓN ---
REGION="eu-central-1"
CLIENT_ID="5uomoc3mlgo6h1cgk76j4pemja"
APPSYNC_URL="https://75nymxzbp5dddnsnehigmroili.appsync-api.eu-central-1.amazonaws.com/graphql"

D_USER="diego_liascovich"
D_PASS="DLpdp1980!"

ORG_ID="f3d4f8a2-90c1-708c-a446-2c8592524d62"
BRANCH_ID="BR-PLANT-001"
PERIOD="2026-04"

echo "🔑 Obteniendo Token..."
ID_TOKEN=$(aws cognito-idp initiate-auth --region "$REGION" --auth-flow USER_PASSWORD_AUTH --client-id "$CLIENT_ID" --auth-parameters USERNAME="$D_USER",PASSWORD="$D_PASS" --query 'AuthenticationResult.IdToken' --output text)

call_appsync() {
    local QUERY=$1
    local LABEL=$2
    echo "📡 $LABEL..."
    local PAYLOAD=$(jq -n --arg q "$QUERY" '{query: $q}')
    curl -s -X POST "$APPSYNC_URL" -H "Authorization: $ID_TOKEN" -H "Content-Type: application/json" -d "$PAYLOAD" | jq .
}

# 1. ORGANIZACIÓN
QUERY_ORG="mutation { 
  saveOrgConfig(orgId: \"$ORG_ID\", input: { 
    name: \"SMS Be'er Sheva Global\", taxId: \"ISR-123\", hqAddress: \"South District\", 
    totalGlobalM2: 15000, industrySector: \"MANUFACTURING\", currency: \"ILS\", 
    reportingCurrency: \"USD\", minConfidence: 0.85, baselineYear: 2024, 
    reductionTarget: 0.40, targetYear: 2030, subscriptionPlan: \"ENTERPRISE\"
  }) { success message } 
}"
call_appsync "$QUERY_ORG" "1. Configuración Org"

# 2. SUCURSAL
QUERY_BRANCH="mutation { 
  createBranch(orgId: \"$ORG_ID\", input: { 
    branchId: \"$BRANCH_ID\", name: \"Planta Be'er Sheva Sur\", m2Surface: 4500, 
    facilityType: \"MANUFACTURING\", timezone: \"Asia/Jerusalem\", region: \"South-District\"
  }) { success branchId } 
}"
call_appsync "$QUERY_BRANCH" "2. Creación de Sucursal"

# 3. EDIFICIO
BUILDING_ID="MAIN-SILO"
QUERY_BUILDING="mutation { 
  saveBuilding(orgId: \"$ORG_ID\", branchId: \"$BRANCH_ID\", buildingId: \"$BUILDING_ID\", input: { 
    name: \"Silo Principal B1\", usageType: \"STORAGE_INDUSTRIAL\", status: \"OPERATIONAL\", 
    yearBuilt: 2015, m2Surface: 1200, m3Volume: 18000, hvacType: \"CENTRAL_CHILLER\", hasBms: true
  }) { success buildingId } 
}"
call_appsync "$QUERY_BUILDING" "3. Registro de Edificio"

# 4. CENTRO DE COSTOS (Nueva incorporación)
QUERY_CC="mutation { 
  saveCostCenter(orgId: \"$ORG_ID\", input: { 
    id: \"CC-PROD-01\", name: \"Línea de Producción B1\", branchId: \"$BRANCH_ID\", 
    method: \"SQUARE_METERS\", percentage: 100.0, annualBudget: 600000
  }) { success } 
}"
call_appsync "$QUERY_CC" "4. Centro de Costos"

# 5. ACTIVO
ASSET_ID="COMPRESOR-B1"
QUERY_ASSET="mutation { 
  saveAsset(orgId: \"$ORG_ID\", assetId: \"$ASSET_ID\", input: { 
    name: \"Compresor Tornillo B1\", category: \"COMPRESSED_AIR\", status: \"OPERATIONAL\", 
    nominalPower: 75.0, meterId: \"MTR-9988\", branchId: \"$BRANCH_ID\", buildingId: \"$BUILDING_ID\", costCenterId: \"CC-PROD-01\"
  }) { success assetId } 
}"
call_appsync "$QUERY_ASSET" "5. Configuración de Activo"

# 6. REGLA DE ALERTA (Nueva incorporación)
QUERY_ALERT="mutation { 
  saveAlertRule(orgId: \"$ORG_ID\", branchId: \"$BRANCH_ID\", entityId: \"$ASSET_ID\", alertType: \"EFFICIENCY\", input: { 
    name: \"Exceso Consumo B1\", status: \"ENABLED\", priority: \"P1_CRITICAL\", threshold: 85.5, operator: \"GREATER_THAN\"
  }) { success } 
}"
call_appsync "$QUERY_ALERT" "6. Regla de Alerta"

# 7. USUARIO (Nueva incorporación)
QUERY_USER="mutation { 
  saveUser(orgId: \"$ORG_ID\", userId: \"$D_USER\", input: { 
    fullName: \"Diego Liascovich\", email: \"diego@sms.com\", role: \"BRANCH_ADMIN\", language: \"es\"
  }) { success } 
}"
call_appsync "$QUERY_USER" "7. Registro de Usuario"

# 8. TARIFA
QUERY_TARIFF="mutation { 
  saveTariff(orgId: \"$ORG_ID\", branchId: \"$BRANCH_ID\", serviceType: \"ELECTRICITY\", input: { 
    providerName: \"IEC\", contractId: \"CONT-9988\", pricingModel: \"TIME_OF_USE\", baseRate: 0.58, 
    validFrom: \"2026-01-01\", validTo: \"2026-12-31\"
  }) { success service } 
}"
call_appsync "$QUERY_TARIFF" "8. Configuración de Tarifa"

# 9. PRODUCCIÓN
QUERY_PROD="mutation { 
  saveProductionLog(orgId: \"$ORG_ID\", branchId: \"$BRANCH_ID\", period: \"$PERIOD\", input: { 
    units: 1250.5, unitType: \"TONS\", shiftMode: \"24/7\", efficiency: 0.98, activeLines: 3
  }) { success } 
}"
call_appsync "$QUERY_PROD" "9. Registro de Producción"

# 10. FACTOR DE EMISIÓN (Nueva incorporación)
QUERY_FACTOR="mutation { 
  saveEmissionFactor(input: { 
    name: \"Israel Grid\", year: 2026, regionCode: \"ISR\", activityType: \"ELEC\", 
    unit: \"kg/kWh\", value: 0.452, scope: \"SCOPE_2\"
  }) { success } 
}"
call_appsync "$QUERY_FACTOR" "10. Factor de Emisión"

# 11. MEDIDOR
METER_ID="MTR-MAIN-001"
QUERY_METER="mutation { 
  saveMeter(orgId: \"$ORG_ID\", branchId: \"$BRANCH_ID\", meterId: \"$METER_ID\", input: { 
    name: \"Medidor General\", serialNumber: \"SN-2026\", iotName: \"IOT-MTR-01\", 
    protocol: \"MQTT\", type: \"ELECTRICITY\", isMain: true, buildingId: \"$BUILDING_ID\"
  }) { success meterId } 
}"
call_appsync "$QUERY_METER" "11. Configuración de Medidor"

echo "✅ Proceso completo: Organización configurada y lista para analíticas."