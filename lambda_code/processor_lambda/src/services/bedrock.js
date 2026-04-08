import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    maxAttempts: 3
});

/**
 * Servicio de Auditoría GenAI (Claude 3 Haiku).
 * Mantiene las reglas originales e integra la prioridad de atribución temporal.
 */
export const analyzeInvoice = async (rawText) => {
    console.log(`   [BEDROCK_START]: Analizando texto crudo (${rawText.length} caracteres)...`);

const systemPrompt = `
You are a Senior ESG Data Auditor. 
Your task is to analyze the raw OCR text of an invoice and extract data for a Sustainability Management System (SMS).

### STEP 1: CLASSIFY
Identify the main category: [ELEC, GAS, WATER, WASTE_PAPER, WASTE_MIXED, LOGISTICS, REFRIGERANTS, FLEET, CLOUDOPS, HOTEL].

### STEP 2: VENDOR IDENTIFICATION (GLOBAL TAX ID)
Locate the vendor's fiscal identifier (CIF in Spain, CUIT in Argentina, VAT ID in EU, P.N. in Israel, etc.).
You MUST map this value to "VENDOR_TAX_ID" inside "extracted_data". This is critical for Scope 3 emissions aggregation.

### STEP 3: EMISSION LINES MAPPING (CRITICAL)
For each consumption line found, you MUST include a "category" field that matches one of these keys exactly:
- ELEC, GAS, WATER, WASTE_PAPER, WASTE_MIXED, LOGISTICS, FLEET, REFRIGERANTS, HOTEL, CLOUDOPS.

### CORE OPERATIONAL RULES:
1. OUTPUT: Return ONLY a valid JSON object. No preamble.
2. DATES: YYYY-MM-DD.
3. NUMBERS: Use floats/integers. Use "." as decimal separator (NEVER use ",").
4. UNITS: Standard units (kWh, m3, kg, km, EUR, USD).
5. PERIODS: (CRITICAL) Extract "period_start" and "period_end". 
   If not present, estimate based on the invoice date (e.g., previous full month).
6. CONFIDENCE: Score between 0.0 and 1.0 based on OCR clarity.

### REQUIRED OUTPUT SCHEMA (STRICT CONFORMITY):
{
  "category": "MAIN_CATEGORY_HERE",
  "confidence_score": 0.00,
  "extracted_data": {
    "vendor": "NAME_OF_VENDOR_STRING",
    "VENDOR_TAX_ID": "FISCAL_ID_STRING",
    "invoice_number": "string", 
    "invoice_date": "YYYY-MM-DD",
    "period_start": "YYYY-MM-DD",
    "period_end": "YYYY-MM-DD",
    "total_amount": 0.00,
    "currency": "ISO_4217",
    "location": { "country": "ISO_2" }
  },
  "emission_lines": [
    {
        "category": "ELEC|GAS|WATER|etc", 
        "description": "string",
        "value": 0.00,
        "unit": "string"
    }
  ],
  "technical_ids": { "cups": "string", "meter_id": "string", "tax_id": "string" }
}`;

    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2500,
        temperature: 0,
        system: systemPrompt,
        messages: [
            {
                role: "user",
                content: [{ type: "text", text: `RAW OCR TEXT:\n${rawText}` }]
            }
        ]
    };

    try {
        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload)
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        let resultText = responseBody.content[0].text.trim();

        // Limpieza de JSON
        const jsonStart = resultText.indexOf('{');
        const jsonEnd = resultText.lastIndexOf('}');
        if (jsonStart === -1) throw new Error("No JSON found");

        const finalData = JSON.parse(resultText.substring(jsonStart, jsonEnd + 1));

        console.log(`   [BEDROCK_END]: Detectadas ${finalData.emission_lines?.length || 0} líneas de emisión.`);
        
        return finalData;

    } catch (error) {
        console.error(`❌ [BEDROCK_ERROR]:`, error.message);
        throw error;
    }
};

export default { analyzeInvoice };