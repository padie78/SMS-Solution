const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({ region: "eu-central-1" });

/**
 * Función interna de limpieza y validación de esquema
 */
function validarYLimpiarResultado(resultado) {
    // 1. Asegurar tipos de datos básicos (totales y valores siempre numéricos)
    if (resultado.extracted_data && typeof resultado.extracted_data.total_amount === 'string') {
        resultado.extracted_data.total_amount = parseFloat(resultado.extracted_data.total_amount.replace(/[^0-9.,]/g, '').replace(',', '.'));
    }

    if (resultado.ai_analysis && typeof resultado.ai_analysis.value === 'string') {
        resultado.ai_analysis.value = parseFloat(resultado.ai_analysis.value.replace(/[^0-9.,]/g, '').replace(',', '.'));
    }

    // 2. Validación de campos obligatorios para el SMS
    const camposObligatorios = ['extracted_data', 'ai_analysis', 'climatiq_ready_payload'];
    camposObligatorios.forEach(campo => {
        if (!resultado[campo]) {
            console.warn(`[WARN] El resultado de IA no contiene el campo: ${campo}`);
            // Inicializamos vacío para evitar errores de undefined en el frontend
            resultado[campo] = {};
        }
    });

    return resultado;
}

/**
 * Pipeline de Normalización con IA (Sistema de Gestión de Sostenibilidad)
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

      ### REGLAS DE NEGOCIO CRÍTICAS:
      1. FUSIÓN DE DATOS: Priorizar QUERY_HINTS para valores financieros. Usar SUMMARY para detalles de consumo (kWh, m3, etc.).
      2. PERIODO DE FACTURACIÓN: Obligatorio para análisis de brechas. Si faltan fechas, usar null.
      3. AÑO: Determinar el año de consumo basado en las fechas de facturación (vital para el factor de emisión).

      ### DEFINICIÓN DEL ESQUEMA DE SALIDA (JSON):
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
          "service_type": "elec|gas|water|fuel",
          "scope": 1|2|3,
          "year": int,
          "calculation_method": "consumption_based|spend_based",
          "activity_id": "string",
          "parameter_type": "energy|volume|money",
          "value": float,
          "unit": "string",
          "region": "string",
          "confidence_score": float,
          "insight_text": "string"
        },
        "climatiq_ready_payload": {
          "activity_id": "string",
          "parameters": { "energy_value": float, "energy_unit": "string" },
          "year": int,
          "region": "string"
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
        console.log("=== [BEDROCK_INPUT_START] ===");
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

        console.log("=== [BEDROCK_OUTPUT_START] ===");
        console.log(`Latencia: ${duration}ms`);
        
        // Extraer JSON de la respuesta (maneja si la IA incluye texto extra)
        const jsonMatch = contentText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("La IA no incluyó un bloque JSON en su respuesta.");
        }
        
        let finalResult = JSON.parse(jsonMatch[0]);

        // --- AQUÍ SE LLAMA A LA FUNCIÓN DE LIMPIEZA ---
        finalResult = validarYLimpiarResultado(finalResult);

        console.log("✅ Resultado final normalizado listo para DynamoDB");
        return finalResult;

    } catch (error) {
        console.error("🚨 [BEDROCK_PIPELINE_ERROR]:", error.message);
        throw new Error(`Fallo en la Normalización de IA: ${error.message}`);
    }
};