import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "eu-central-1" });

export const callExtractionAgent = async (rawText) => {
    const prompt = `
    You are an expert Accounting and ESG (Environmental, Social, and Governance) Data Analyst. 
    Your task is to parse the following raw OCR text from a utility invoice and convert it into a strictly structured JSON format.

    RAW INVOICE TEXT:
    "${rawText}"

    EXTRACTION RULES:
    1. ZERO HALLUCINATION: If a specific data point is not found, return null. 
    2. NUMERIC PRECISION: "total_amount" and line "amount" must be numbers (float), not strings. Remove currency symbols.
    3. CUPS/METER ID: Locate the "CUPS" (for Spanish invoices) or "Meter ID". It is critical for tracking.
    4. DATE FORMAT: All dates must be in YYYY-MM-DD format.
    5. CONSUMPTION: Look for energy units (kWh, m3, liters) and include them in the line descriptions.
    6. TAXES: Identify the Tax/VAT amount if clearly stated.

    EXPECTED JSON SCHEMA:
    {
        "vendor_name": "string or null",
        "vendor_tax_id": "string or null",
        "invoice_number": "string or null",
        "date": "YYYY-MM-DD or null",
        "cups": "string or null",
        "total_amount": number or null,
        "currency": "string (e.g., EUR, USD)",
        "period_start": "YYYY-MM-DD or null",
        "period_end": "YYYY-MM-DD or null",
        "tax_amount": number or null,
        "lines": [
            { 
                "description": "string", 
                "quantity": number or null, 
                "unit": "string (e.g., kWh, kW, days)", 
                "amount": number 
            }
        ]
    }

    Respond ONLY with the JSON object. Do not include any preamble or explanation.`;

    try {
        const input = {
            modelId: "anthropic.claude-3-haiku-20240307-v1:0", 
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 2000,
                temperature: 0, // Keep it deterministic for data extraction
                messages: [{ role: "user", content: prompt }]
            }),
        };

        const command = new InvokeModelCommand(input);
        const response = await client.send(command);
        
        const resBody = JSON.parse(new TextDecoder().decode(response.body));
        const textResponse = resBody.content[0].text;

        // Clean output to ensure valid JSON parsing
        const jsonStart = textResponse.indexOf('{');
        const jsonEnd = textResponse.lastIndexOf('}') + 1;
        const cleanJson = textResponse.substring(jsonStart, jsonEnd);
        
        return JSON.parse(cleanJson);

    } catch (error) {
        console.error("❌ [AGENT_ERROR]: AI Extraction failed.", error);
        return null;
    }
};