const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({ region: "eu-central-1" });

/**
 * Pipeline de Normalización con IA (Sistema de Gestión de Sostenibilidad)
 */
exports.entenderConIA = async (summary, queryHints) => {
    const modelId = "eu.anthropic.claude-haiku-4-5-20251001-v1:0";

    /**
 * Pipeline de Normalización con IA (Sistema de Gestión de Sostenibilidad)
 * Integra este bloque justo al inicio de tu función exports.entenderConIA
 */
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
          "vendor": "string",
          "invoice_number": "string",
          "invoice_date": "YYYY-MM-DD",
          "billing_period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
          "total_amount": float,
          "currency": "ISO_4217",
          "meter_id": "string|null"
        },
        "ai_analysis": {
          "service_type": "elec|gas|water|fuel|freight|travel|waste",
          "scope": 1|2|3,
          "year": int,
          "calculation_method": "consumption_based|spend_based",
          "activity_id": "string",
          "parameter_type": "energy|volume|weight|money",
          "value": float,
          "unit": "string",
          "region": "string",
          "is_estimated_reading": bool,
          "is_renewable": bool,
          "route": [{"from": "string", "to": "string", "mode": "road|air"}],
          "legs": [{"from": "string", "to": "string", "class": "economy"}],
          "passengers": int,
          "confidence_score": float,
          "anomaly_detected": boolean,
          "insight_text": "string"
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
        // --- LOG DE ENTRADA ---
        console.log("=== [BEDROCK_INPUT_START] ===");
        console.log(`Modelo: ${modelId}`);
        console.log("Payload enviado a Bedrock:", JSON.stringify({
            queryHints,
            summaryLength: summary.length,
            modelParams: { temperature: bodyPayload.temperature, max_tokens: bodyPayload.max_tokens }
        }, null, 2));
        // Opcional: console.log("System Prompt:", systemPrompt); // Solo si necesitas debuggear el prompt largo
        console.log("=== [BEDROCK_INPUT_END] ===");

        const command = new InvokeModelCommand({
            modelId,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(bodyPayload)
        });

        const startTime = Date.now();
        const response = await client.send(command);
        const duration = Date.now() - startTime;

        const rawRes = new TextDecoder().decode(response.body);
        const parsedRes = JSON.parse(rawRes);
        const contentText = parsedRes.content?.[0]?.text || "";

        // --- LOG DE SALIDA (RAW) ---
        console.log("=== [BEDROCK_OUTPUT_START] ===");
        console.log(`Latencia: ${duration}ms`);
        console.log("Respuesta cruda de la IA:", contentText);

        const jsonMatch = contentText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("❌ ERROR: La IA no incluyó un bloque JSON en su respuesta.");
            throw new Error("La IA no devolvió un JSON válido");
        }
        
        const finalResult = JSON.parse(jsonMatch[0]);

        // Sanitización final de datos
        validarYLimpiarResultado(finalResult);

        // --- LOG DE RESULTADO FINAL ---
        console.log("Resultado final normalizado:", JSON.stringify(finalResult, null, 2));
        console.log("=== [BEDROCK_OUTPUT_END] ===");

        return finalResult;

    } catch (error) {
        console.error("🚨 [BEDROCK_PIPELINE_ERROR]:", error.message);
        if (error.stack) console.error("Stack Trace:", error.stack);
        throw new Error(`Fallo en la Normalización de IA: ${error.message}`);
    }
};