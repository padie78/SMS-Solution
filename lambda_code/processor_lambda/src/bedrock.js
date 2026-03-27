const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({ region: "eu-central-1" });

/**
 * Procesa el texto crudo y los 'query_hints' de Textract.
 * Compara ambas fuentes para generar un registro de alta confianza.
 */
exports.entenderConIA = async (summary, queryHints) => {
    const modelId = "eu.anthropic.claude-haiku-4-5-20251001-v1:0";

    const systemPrompt = `You are a Senior Sustainability Data Engineer. 
    Mission: Act as a deterministic middleware between raw OCR and Climatiq API.
    
    ### DATA SOURCES:
    1. SUMMARY: Raw OCR text (low structure).
    2. QUERY_HINTS: Key-value pairs extracted by specialized AWS Textract Queries (high precision).
    
    ### CRITICAL RULES:
    - If SUMMARY and QUERY_HINTS conflict, PRIORITIZE QUERY_HINTS for vendor, dates, and amounts.
    - OUTPUT ONLY RAW JSON. No prose.
    - DATE FORMAT: YYYY-MM-DD.
    - SCOPE: Electricity(2), Gas(1), Fuel(1), Water(3).
    - CALCULATION METHOD: 
        - 'consumption_based' if units (kWh, m3, L) exist.
        - 'spend_based' if only amount exists. (Unit MUST be the Currency ISO).

    ### SCHEMA:
    {
      "extracted_data": {
        "vendor": "UPPERCASE", "invoice_number": "string|null", "invoice_date": "YYYY-MM-DD",
        "period_start": "string|null", "period_end": "string|null", "total_amount": float,
        "currency": "ISO_4217", "raw_consumption": float|null, "raw_unit": "string|null",
        "site_location": "string|null", "account_id": "string|null"
      },
      "ai_analysis": {
        "service_type": "Electricity|Gas|Water|Fuel|Waste|Unknown",
        "scope": 1|2|3, "calculation_method": "consumption_based|spend_based",
        "activity_id": "string", "parameter_type": "energy|volume|weight|money",
        "value": float, "unit": "string", "confidence_score": float,
        "requires_review": boolean, "insight_text": "string"
      }
    }`;

    const userPrompt = `Analyze this data for carbon footprinting:
    QUERY_HINTS: ${JSON.stringify(queryHints)}
    FULL_SUMMARY: ${summary}`;

    const bodyPayload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2500,
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
        if (!jsonMatch) throw new Error("No valid JSON in AI response");
        
        const finalResult = JSON.parse(jsonMatch[0]);

        // Validación y casteado de tipos
        validateResult(finalResult);

        return finalResult;

    } catch (error) {
        console.error("[BEDROCK_PIPELINE_ERROR]:", error.message);
        throw new Error(`AI Normalization Failed: ${error.message}`);
    }
};

function validateResult(data) {
    const required = ["service_type", "activity_id", "value", "unit"];
    for (const field of required) {
        if (!data.ai_analysis?.[field]) throw new Error(`Missing mandatory field: ai_analysis.${field}`);
    }
    // Forzamos tipos numéricos para evitar strings en la DB
    data.ai_analysis.value = Number(data.ai_analysis.value) || 0;
    data.extracted_data.total_amount = Number(data.extracted_data.total_amount) || 0;
}