const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({ region: "eu-central-1" });

/**
 * Función interna de limpieza y validación de esquema
 */
function validarYLimpiarResultado(resultado) {
    const parseNumeric = (val) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            // Elimina símbolos de moneda, espacios y convierte coma decimal a punto
            const clean = val.replace(/[^\d,.-]/g, '').replace(',', '.');
            return parseFloat(clean);
        }
        return 0;
    };

    if (resultado.extracted_data) {
        resultado.extracted_data.total_amount = parseNumeric(resultado.extracted_data.total_amount);
    }

    if (resultado.ai_analysis) {
        resultado.ai_analysis.value = parseNumeric(resultado.ai_analysis.value);
        resultado.ai_analysis.year = parseInt(resultado.ai_analysis.year) || new Date().getFullYear();
    }

    // Asegurar estructura mínima para evitar errores en cascada
    const defaultStructure = {
        extracted_data: { vendor: "UNKNOWN", total_amount: 0 },
        ai_analysis: { service_type: "unknown", confidence_score: 0 },
        climatiq_ready_payload: {}
    };

    return { ...defaultStructure, ...resultado };
}

/**
 * Pipeline de Normalización con IA (Sistema de Gestión de Sostenibilidad)
 */
exports.entenderConIA = async (summary, queryHints) => {
    const modelId = "eu.anthropic.claude-haiku-4-5-20251001-v1:0";

    const systemPrompt = `Eres un Ingeniero Senior de Datos de Sostenibilidad. 
      Misión: Actuar como un middleware determinista entre el OCR bruto y la API de Climatiq.
      
      IMPORTANTE: Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON válido. 
      No incluyas introducciones, explicaciones ni comentarios después del cierre del JSON.

      ### REFERENCIA DE MAPEO CLIMATIQ (ESTRICTO):
      - ELECTRICITY: 'electricity-supply_grid-source_production_mix'
      - WATER: 'water-type_tap_water'
      - NATURAL GAS: 'natural_gas-fuel_type_natural_gas'
      - DIESEL: 'fuel-type_diesel_fuel-source_generic'

      ### REGLAS DE NEGOCIO:
      1. FUSIÓN DE DATOS: Priorizar QUERY_HINTS para la cabecera. Busca en SUMMARY/LINE_ITEMS valores de consumo (kWh, m3, Litros).
      2. LIMPIEZA: Extrae el valor numérico puro. Si dice "1123kWh", tu valor es 1123.
      3. AÑO: Usa el año de 'billing_period' o 'invoice_date'.

      ### DEFINICIÓN DEL ESQUEMA:
      {
        "extracted_data": {
          "vendor": "string",
          "invoice_number": "string",
          "invoice_date": "YYYY-MM-DD",
          "billing_period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
          "total_amount": float,
          "currency": "ISO_4217"
        },
        "ai_analysis": {
          "service_type": "elec|gas|water|fuel",
          "year": int,
          "calculation_method": "consumption_based|spend_based",
          "activity_id": "string",
          "value": float,
          "unit": "kWh|m3|l|money",
          "confidence_score": float,
          "insight_text": "string"
        },
        "climatiq_ready_payload": {
          "activity_id": "string",
          "parameters": { "energy_value": float, "energy_unit": "string" },
          "year": int,
          "region": "ES"
        }
      }`;

    const userPrompt = `Analiza este documento:
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

        const startTime = Date.now();
        const response = await client.send(command);
        const duration = Date.now() - startTime;

        const rawRes = new TextDecoder().decode(response.body);
        const parsedRes = JSON.parse(rawRes);
        const contentText = parsedRes.content?.[0]?.text || "";

        console.log("=== [BEDROCK_DEBUG] ===");
        console.log(`Latencia: ${duration}ms`);

        // --- EXTRACCIÓN SEGURA DE JSON ---
        const firstBracket = contentText.indexOf('{');
        const lastBracket = contentText.lastIndexOf('}');
        
        if (firstBracket === -1 || lastBracket === -1) {
            console.error("Respuesta cruda fallida:", contentText);
            throw new Error("La IA no devolvió un objeto JSON válido");
        }

        const jsonString = contentText.substring(firstBracket, lastBracket + 1);
        let finalResult = JSON.parse(jsonString);

        // Limpieza y validación
        finalResult = validarYLimpiarResultado(finalResult);

        console.log("✅ Normalización exitosa para:", finalResult.extracted_data.vendor);
        return finalResult;

    } catch (error) {
        console.error("🚨 [BEDROCK_ERROR]:", error.message);
        throw new Error(`Fallo en la Normalización de IA: ${error.message}`);
    }
};