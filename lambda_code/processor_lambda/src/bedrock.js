const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({ region: "eu-central-1" });

/**
 * Pipeline de Normalización con IA (Sistema de Gestión de Sostenibilidad)
 * Extracción de alta precisión para reportes ESG e integración con la API de Climatiq.
 */
exports.entenderConIA = async (summary, queryHints) => {
    const modelId = "eu.anthropic.claude-haiku-4-5-20251001-v1:0";

    const systemPrompt = `Eres un Ingeniero Senior de Datos de Sostenibilidad. 
    Misión: Actuar como un middleware determinista entre el OCR bruto y la API de Climatiq.
    
    ### REFERENCIA DE MAPEO CLIMATIQ (ESTRICTO):
    - ELECTRICITY: 'electricity-supply_grid-source_production_mix'
    - WATER: 'water-type_tap_water'
    - NATURAL GAS: 'natural_gas-fuel_type_natural_gas'
    - DIESEL: 'fuel-type_diesel_fuel-source_generic'
    - FREIGHT: 'transport-heavy_goods_vehicle-fuel_source_diesel'
    - TRAVEL/FLIGHTS: 'passenger_flight-type_long_haul-class_economy'

    ### REGLAS DE NEGOCIO CRÍTICAS:
    1. FUSIÓN DE DATOS: Priorizar QUERY_HINTS para valores financieros. Usar SUMMARY para detalles de consumo (kWh, m3, etc.).
    2. PERIODO DE FACTURACIÓN: Obligatorio para análisis de brechas. Si faltan fechas, usar null.
    3. REDUCCIÓN DE RUIDO: Restar recargos por mora, intereses o cargos de mantenimiento del 'value' si el método es 'spend_based'.
    4. AÑO: Determinar el año de consumo basado en las fechas de facturación (vital para la precisión del factor de emisión).

    ### DEFINICIÓN DEL ESQUEMA DE SALIDA:
    {
      "extracted_data": {
        "vendor": "string",            // Nombre del proveedor (ej: 'Mekorot', 'Hevrat HaHashmal')
        "invoice_number": "string",    // Para trazabilidad y detección de duplicados (Idempotencia)
        "invoice_date": "YYYY-MM-DD",  // Fecha de emisión de la factura
        "billing_period": { 
            "start": "YYYY-MM-DD",     // Inicio del servicio (para cobertura de reportes anuales)
            "end": "YYYY-MM-DD"        // Fin del servicio
        },
        "total_amount": float,         // Costo financiero total (tal cual aparece impreso)
        "currency": "ISO_4217",        // Moneda (ej: 'ILS', 'USD')
        "meter_id": "string|null"      // ID del medidor físico para tracking por sede/planta
      },
      "ai_analysis": {
        "service_type": "string",      // elec|gas|water|fuel|freight|travel|waste
        "scope": 1|2|3,                // Categorización según GHG Protocol
        "year": int,                   // Crítico para seleccionar factores de emisión históricos correctos
        "calculation_method": "string",// 'consumption_based' (por unidad) o 'spend_based' (por dinero)
        "activity_id": "string",       // Identificador técnico de Climatiq
        "parameter_type": "string",    // Clave de Climatiq: energy|volume|weight|money
        "value": float,                // Valor neto para el cálculo (limpio de ruidos financieros/multas)
        "unit": "string",              // Unidad normalizada (kWh, m3, L, t). Si es money, debe coincidir con currency.
        "region": "string",            // Código ISO (ej: 'IL'). Default 'WORLD' si se desconoce.
        "is_estimated_reading": bool,  // True si el proveedor estimó el consumo (baja precisión)
        "is_renewable": bool,          // True si hay evidencia de energía verde/renovable
        "route": [{"from": "string", "to": "string", "mode": "road|air"}], // Para Logística/Fletes
        "legs": [{"from": "string", "to": "string", "class": "economy"}],  // Para Viajes/Vuelos
        "passengers": int | 1,         // Cantidad de personas para prorrateo en viajes
        "confidence_score": float,     // Autoevaluación de la IA (0.0 a 1.0)
        "anomaly_detected": boolean,   // True si el consumo es sospechoso o contiene cargos no-CO2
        "insight_text": "string"       // Trail de auditoría (ej: 'Se excluyeron 50 ILS por intereses de mora')
      }
    }`;

    const userPrompt = `Analiza este documento para contabilidad de carbono:
    QUERY_HINTS: ${JSON.stringify(queryHints)}
    FULL_SUMMARY: ${summary}`;

    const bodyPayload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0
    };

    try {
        const command = new InvokeModelCommand({
            modelId,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(bodyPayload)
        });

        const response = await client.send(command);
        const rawRes = new TextDecoder().decode(response.body);
        const parsedRes = JSON.parse(rawRes);
        const contentText = parsedRes.content?.[0]?.text || "";

        const jsonMatch = contentText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("La IA no devolvió un JSON válido");
        
        const finalResult = JSON.parse(jsonMatch[0]);

        // Sanitización final de datos
        validarYLimpiarResultado(finalResult);

        return finalResult;

    } catch (error) {
        console.error(`[BEDROCK_PIPELINE_ERROR]: ${error.message}`);
        throw new Error(`Fallo en la Normalización de IA: ${error.message}`);
    }
};

/**
 * Asegura la integridad de los datos antes de la ingesta en DB o llamada a la API.
 */
function validarYLimpiarResultado(data) {
    const ai = data.ai_analysis;
    const ext = data.extracted_data;

    if (!ai || !ext) throw new Error("Estructura JSON incompleta");

    const required = ["service_type", "activity_id", "value", "unit"];
    required.forEach(field => {
        if (!ai[field]) throw new Error(`Campo obligatorio faltante: ai_analysis.${field}`);
    });

    ai.value = parseFloat(ai.value) || 0;
    ext.total_amount = parseFloat(ext.total_amount) || 0;
    ai.confidence_score = parseFloat(ai.confidence_score) || 0;
    
    if (!ai.year && ext.invoice_date) {
        ai.year = new Date(ext.invoice_date).getFullYear();
    }

    if (!ai.region || ai.region === "unknown") ai.region = "IL";
}

/* ================================================================================
EJEMPLOS DE SALIDA ESPERADA (REFERENCIA PARA DESARROLLO)
================================================================================

EJEMPLO 1: ELECTRICIDAD (Consumo Real / Consumption-based)
--------------------------------------------------------------------------------
{
  "extracted_data": {
    "vendor": "Israel Electric Corporation (Hevrat HaHashmal)",
    "invoice_number": "INV-88291004",
    "invoice_date": "2026-03-15",
    "billing_period": { "start": "2026-01-01", "end": "2026-02-28" },
    "total_amount": 540.50,
    "currency": "ILS",
    "meter_id": "MTR-992233-X"
  },
  "ai_analysis": {
    "service_type": "elec",
    "scope": 2,
    "year": 2026,
    "calculation_method": "consumption_based",
    "activity_id": "electricity-supply_grid-source_production_mix",
    "parameter_type": "energy",
    "value": 850.4,
    "unit": "kWh",
    "region": "IL",
    "is_estimated_reading": false,
    "is_renewable": false,
    "route": null,
    "legs": null,
    "confidence_score": 0.98,
    "anomaly_detected": false,
    "insight_text": "Consumo validado. Datos de medidor extraídos correctamente."
  }
}

EJEMPLO 2: LOGÍSTICA (Gasto Financiero con Ruido / Spend-based)
--------------------------------------------------------------------------------
{
  "extracted_data": {
    "vendor": "ZIM INTEGRATED SHIPPING",
    "invoice_number": "FR-55221",
    "invoice_date": "2026-03-20",
    "billing_period": { "start": "2026-03-01", "end": "2026-03-15" },
    "total_amount": 1250.00,
    "currency": "USD",
    "meter_id": null
  },
  "ai_analysis": {
    "service_type": "freight",
    "scope": 3,
    "year": 2026,
    "calculation_method": "spend_based",
    "activity_id": "transport-heavy_goods_vehicle-fuel_source_diesel",
    "parameter_type": "money",
    "value": 1100.00, 
    "unit": "USD",
    "region": "IL",
    "is_estimated_reading": false,
    "is_renewable": false,
    "route": [{ "from": "Ashdod Port", "to": "Be'er Sheva", "mode": "road" }],
    "legs": null,
    "confidence_score": 0.92,
    "anomaly_detected": true,
    "insight_text": "Se restaron 150 USD del valor neto debido a recargos por demora (Late fees)."
  }
}
================================================================================
*/