import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "eu-central-1" });

export const callExtractionAgent = async (rawText) => {
    const prompt = `
    You are an expert Accounting and ESG (Environmental, Social, and Governance) Data Analyst. 
    Your task is to parse the following raw OCR text from a utility invoice and convert it into a strictly structured JSON format.

    RAW INVOICE TEXT:
    "${rawText}"

    EXTRACTION RULES:
    1. ZERO HALLUCINATION: If a data point is not found, return null. 
    2. NUMERIC PRECISION: All amounts must be floats. Remove currency symbols.
    3. CUPS/METER ID: Critical for tracking.
    4. DATE FORMAT: YYYY-MM-DD.
    5. LINES: Extract every billing item (Power, Energy, Taxes, etc.).

    EXPECTED JSON SCHEMA:
    {
        "vendor_name": "string",
        "vendor_tax_id": "string",
        "invoice_number": "string",
        "date": "YYYY-MM-DD",
        "cups": "string",
        "total_amount": number,
        "currency": "string",
        "period_start": "YYYY-MM-DD",
        "period_end": "YYYY-MM-DD",
        "tax_amount": number,
        "lines": [
            { "description": "string", "quantity": number, "unit": "string", "amount": number }
        ]
    }
    Respond ONLY with the JSON object.`;

    try {
        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0", 
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 2500,
                temperature: 0,
                messages: [{ role: "user", content: prompt }]
            }),
        });

        const response = await client.send(command);
        const resBody = JSON.parse(new TextDecoder().decode(response.body));
        const textResponse = resBody.content[0].text;

        const jsonStart = textResponse.indexOf('{');
        const jsonEnd = textResponse.lastIndexOf('}') + 1;
        return JSON.parse(textResponse.substring(jsonStart, jsonEnd));

    } catch (error) {
        console.error("❌ [AGENT_ERROR]:", error);
        return null; 
    }
};