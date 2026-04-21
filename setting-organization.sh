#!/bin/bash

# --- CONFIGURACIÓN ---
REGION="eu-central-1"
CLIENT_ID="5uomoc3mlgo6h1cgk76j4pemja"
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
# Ejemplo de ejecución
# Variables de entorno previas
ORG_ID="f3d4f8a2-90c1-708c-a446-2c8592524d62"

# Construcción de la Mutation
# Nota: Asegúrate de que los nombres coincidan con las claves de 'input' en tu Lambda
QUERY_ORG="mutation { 
  saveOrgConfig(
    orgId: \"$ORG_ID\", 
    input: { 
      # --- Identidad Corporativa ---
      name: \"SMS Be'er Sheva Global\",
      taxId: \"ISR-123\",
      hqAddress: \"South District, Be'er Sheva\",
      totalGlobalM2: 15000,
      industrySector: \"MANUFACTURING\",

      # --- Configuración de Inteligencia (Energy Intelligence) ---
      currency: \"ILS\",
      reportingCurrency: \"USD\",
      minConfidence: 0.85,
      gasConversion: 10.55,
      referenceUnitRate: 0.15,
      carbonShadowPrice: 50.00,

      # --- Estándares de Sostenibilidad (Compliance) ---
      baselineYear: 2024,
      ghgMethodology: \"LOCATION_BASED\",
      reductionTarget: 0.40,
      targetYear: 2030,

      # --- Resumen de Estructura ---
      activeBranches: 5,
      totalAssets: 120,
      subscriptionPlan: \"ENTERPRISE\"
    }
  ) { 
    success 
  } 
}"

# Ejecución
call_appsync "$QUERY_ORG" "1. Configuración Org"

BRANCH_ID="BR-PLANT-001" # Opcional: si no lo pasas, la Lambda genera uno

QUERY_BRANCH="mutation { 
  createBranch(
    orgId: \"$ORG_ID\", 
    input: { 
      # --- Identidad y Geografía ---
      branchId: \"$BRANCH_ID\",
      name: \"Planta Be'er Sheva Sur\",
      m2Surface: 4500,
      m3Volume: 27000,
      manager: \"Diego Liascovich\",
      facilityType: \"MANUFACTURING\",
      timezone: \"Asia/Jerusalem\",
      geoLocation: \"31.2518, 34.7913\",

      # --- Parámetros Operativos (KPIs Inteligentes) ---
      energyTarget: 120.5,        # kWh por Tonelada producida
      carbonBudget: 500.0,        # Toneladas de CO2 anuales
      baseloadThreshold: 45.0,    # kW de consumo base (vampiro)
      maxPowerCapacity: 600.0,    # kVA contratados para evitar multas
      operatingHours: \"24/7\",

      # --- Cumplimiento y Auditoría ---
      emissionFactor: 0.452,      # kgCO2e/kWh (Israel Grid)
      isIsoCertified: true,
      lastAuditDate: \"2026-03-15\",

      # --- Clasificación ---
      region: \"South-District\",
      criticality: \"HIGH\",
      primaryCC: \"CC-PROD-01\",
      userId: \"admin_diego\"
    }
  ) { 
    success 
    branchId
  } 
}"

call_appsync "$QUERY_BRANCH" "2. Creación de Sucursal"

BUILDING_ID="MAIN-SILO"

QUERY_BUILDING="mutation { 
  saveBuilding(
    orgId: \"$ORG_ID\", 
    branchId: \"$BRANCH_ID\", 
    buildingId: \"$BUILDING_ID\",
    input: { 
      # --- Información General ---
      name: \"Silo Principal B1\",
      usageType: \"STORAGE_INDUSTRIAL\",
      status: \"OPERATIONAL\",
      yearBuilt: 2015,
      managerContact: \"mantenimiento@sms.com\",

      # --- Especificaciones Físicas (Ingeniería) ---
      m2Surface: 1200,
      m3Volume: 18000,
      maxOccupancy: 15,
      roofType: \"REINFORCED_CONCRETE\",
      uValue: 0.35,              # Coeficiente de transmitancia térmica

      # --- Configuración de Sistemas ---
      hvacType: \"CENTRAL_CHILLER\",
      lightingTech: \"LED_SMART\",
      hasBms: true,
      hasBackup: true,

      # --- Contexto y Clasificación ---
      zoneId: \"ZONE-A-SOUTH\",
      isShared: false,
      criticality: \"HIGH\",
      primaryCC: \"CC-PROD-01\"
    }
  ) { 
    success 
    buildingId
  } 
}"

call_appsync "$QUERY_BUILDING" "3. Registro de Edificio"


CC_ID="CC-PROD-01"

QUERY_CC="mutation { 
  saveCostCenter(
    orgId: \"$ORG_ID\", 
    input: { 
      # --- Identidad Contable ---
      id: \"$CC_ID\",
      name: \"Línea de Producción B1\",
      accountingCode: \"700-001\",
      managerId: \"USER#12345\",
      branchId: \"BR-PLANT-001\",

      # --- Reglas de Prorrateo (Allocation) ---
      method: \"SQUARE_METERS\",
      percentage: 12.5,
      operatingHours: 16,
      isVatExempt: false,

      # --- Control Presupuestario ---
      annualBudget: 600000,
      thresholds: [75, 90, 100],
      budgetPolicy: \"BLOCK_DRAFT\",

      # --- Integración ---
      glMapping: \"EXP-ENERGY-IND-01\"
    }
  ) { 
    success 
    ccId
  } 
}"

call_appsync "$QUERY_CC" "4. Centro de Costos"


ASSET_ID="COMPRESOR-B1"

QUERY_ASSET="mutation { 
  saveAsset(
    orgId: \"$ORG_ID\", 
    assetId: \"$ASSET_ID\",
    input: { 
      # --- Información Básica ---
      name: \"Compresor de Aire Tornillo B1\",
      category: \"COMPRESSED_AIR\",
      status: \"OPERATIONAL\",
      criticality: \"HIGH\",

      # --- Especificaciones Técnicas ---
      nominalPower: 75.0,
      efficiencyClass: \"IE4\",
      powerFactor: 0.88,

      # --- Conectividad IoT ---
      meterId: \"MTR-9988\",
      iotName: \"IR_NIRVANA_B1_SOUTH\",

      # --- Asignación Espacial y Contable ---
      branchId: \"BR-PLANT-001\",
      buildingId: \"MAIN-SILO\",
      costCenterId: \"CC-PROD-01\",
      geoXyz: \"12.5, 45.8, 2.0\"
    }
  ) { 
    success 
    assetId
  } 
}"

call_appsync "$QUERY_ASSET" "5. Configuración de Activo"


SERVICE_TYPE="ELECTRICITY"

QUERY_TARIFF="mutation { 
  saveTariff(
    orgId: \"$ORG_ID\", 
    branchId: \"$BRANCH_ID\", 
    serviceType: \"$SERVICE_TYPE\",
    input: { 
      # --- Información del Proveedor ---
      providerName: \"IEC (Israel Electric Corporation)\",
      contractId: \"CONT-9988-X\",
      accountNumber: \"100200300\",
      supportContact: \"support@iec.co.il\",

      # --- Estructura de Costos ---
      billingCycle: \"MONTHLY\",
      currency: \"ILS\",
      pricingModel: \"TIME_OF_USE\",
      baseRate: 0.58,
      peakRate: 0.72,
      offPeakRate: 0.41,
      fixedFee: 150.00,
      reactivePenalty: 0.05,
      
      # Array de impuestos (JSON stringificado para la mutation)
      taxes: [
        { name: \"VAT\", rate: 17.0 },
        { name: \"Excise Tax\", rate: 0.02 }
      ],

      # --- Restricciones Técnicas ---
      contractedPower: 450,
      voltageLevel: \"MEDIUM_VOLTAGE\",
      meterId: \"MTR-554433\",

      # --- Metadata ---
      validFrom: \"2026-01-01\",
      validTo: \"2026-12-31\",
      userId: \"diego_admin\"
    }
  ) { 
    success 
    service
    tariffId    # <--- Para saber qué ID se generó (el SK)
    assetId     # <--- Por compatibilidad genérica
    branchId    # <--- Para confirmar la sede
  } 
}"

call_appsync "$QUERY_TARIFF" "6. Configuración de Tarifa"


ENTITY_ID="COMPRESOR-B1"
ALERT_TYPE="EFFICIENCY"

QUERY_ALERT="mutation { 
  saveAlertRule(
    orgId: \"$ORG_ID\", 
    branchId: \"$BRANCH_ID\", 
    entityId: \"$ENTITY_ID\", 
    alertType: \"$ALERT_TYPE\",
    input: { 
      # --- Identidad de la Regla ---
      name: \"Exceso de Consumo - Compresor B1\",
      description: \"Alerta cuando el consumo instantáneo supera el nominal + 15%\",
      status: \"ENABLED\",
      priority: \"P1_CRITICAL\",

      # --- Lógica de Disparo (Engine Logic) ---
      metricSource: \"active_power_kw\",
      operator: \"GREATER_THAN\",
      threshold: 85.5,
      durationMins: 10,
      hysteresis: 5,

      # --- Estrategia de Notificación ---
      channels: [\"EMAIL\", \"PUSH\", \"WEBHOOK\"],
      recipients: [\"mantenimiento@sms.com\", \"diego@sms.com\"],
      escalationPolicy: \"EP-GOLD-MAINTENANCE\",
      suppressionMins: 60,

      # --- Automatización y Respuesta ---
      autoIncident: true,
      remediation: \"Check for air leaks in Line Silo B or cooling fan failure.\"
    }
  ) { 
    success 
    alertKey
  } 
}"

call_appsync "$QUERY_ALERT" "7. Regla de Alerta"


USER_ID="diego_liascovich"

QUERY_USER="mutation { 
  saveUser(
    orgId: \"$ORG_ID\", 
    userId: \"$USER_ID\",
    input: { 
      # --- Identidad y Vínculo Cloud ---
      fullName: \"Diego Liascovich\",
      email: \"diego@sms.com\",
      position: \"Senior Energy Manager\",
      cognitoSub: \"us-east-1:a1b2c3d4-e5f6-7890\",

      # --- Seguridad y Permisos (RBAC) ---
      role: \"BRANCH_ADMIN\",
      permissions: [\"APPROVE_INVOICE\", \"EDIT_ASSETS\", \"VIEW_REPORTS\"],
      accessScope: \"BRANCH#BR-PLANT-001\",

      # --- Experiencia de Usuario ---
      defaultDashboard: \"OPERATIONAL_EFFICIENCY\",
      language: \"es\",
      emailAlerts: true,
      smsAlerts: true
    }
  ) { 
    success 
    userId
  } 
}"

call_appsync "$QUERY_USER" "8. Registro de Usuario"


PERIOD="2026-04"

QUERY_PROD="mutation { 
  saveProductionLog(
    orgId: \"$ORG_ID\", 
    branchId: \"$BRANCH_ID\", 
    period: \"$PERIOD\",
    input: { 
      # --- Métricas de Producción ---
      units: 1250.5,
      unitType: \"TONS\",
      shiftMode: \"24/7\",
      efficiency: 0.98,
      waste: 12.5,
      downtime: 4.5,
      activeLines: 3,

      # --- Contexto Operativo (Clave para IA) ---
      temperature: 28.5,
      humidity: 45,
      rawMaterialBatch: \"BATCH-X-99\",

      # --- Infraestructura ---
      activeM2: 4500
    }
  ) { 
    success 
    logKey
  } 
}"

call_appsync "$QUERY_PROD" "9. Registro de Producción"


QUERY_FACTOR="mutation { 
  saveEmissionFactor(
    input: { 
      # --- Identidad y Trazabilidad ---
      name: \"Israel National Grid Average\",
      year: 2026,
      regionCode: \"ISR\",
      regionName: \"Israel\",
      source: \"Climatiq\",
      activityType: \"ELEC\",
      activityId: \"electricity-supply_grid-average\",

      # --- Datos de Carbono ---
      unit: \"kg/kWh\",
      value: 0.452,
      co2: 0.450,
      ch4: 0.0015,
      n2o: 0.0005,

      # --- Clasificación GHG Protocol ---
      scope: \"SCOPE_2\",
      category: \"ENERGY_INDIRECT\",
      methodology: \"LOCATION_BASED\",
      uncertainty: 2.5,

      # --- Ciclo de Vida ---
      validFrom: \"2026-01-01\",
      validTo: \"2026-12-31\",
      isLatest: true
    }
  ) { 
    success 
    factorKey
  } 
}"

call_appsync "$QUERY_FACTOR" "11. Registro de Factor de Emisión"


METER_ID="MTR-MAIN-001"

QUERY_METER="mutation { 
  saveMeter(
    orgId: \"$ORG_ID\", 
    branchId: \"$BRANCH_ID\", 
    meterId: \"$METER_ID\",
    input: { 
      # --- Identidad del Hardware ---
      name: \"Medidor General de Planta\",
      serialNumber: \"SN-2026-99-AF\",
      manufacturer: \"Schneider Electric\",
      model: \"PowerLogic ION9000\",
      firmware: \"v2.1.4\",

      # --- Conectividad (IoT Core) ---
      iotName: \"IOT-MTR-MAIN-ISR\",
      protocol: \"MQTT\",

      # --- Lógica de Medición ---
      type: \"ELECTRICITY\",
      isMain: true,
      scalingFactor: 80.0,       # Factor CT (Current Transformer) 400:5
      unit: \"kWh\",

      # --- Ubicación ---
      buildingId: \"MAIN-SILO\",
      location: \"Tablero General A1 - Sala de Transformadores\"
    }
  ) { 
    success 
    meterId
  } 
}"

call_appsync "$QUERY_METER" "12. Configuración de Medidor"







echo "✅ Test Finalizado."