import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "eu-central-1" });

export const callExtractionAgent = async (rawText) => {
    const prompt = `
    <system_role>
    You are a high-precision extraction engine for Energy and Utility invoices. 
    Your goal is to transform messy OCR text into structured ESG-ready JSON.
    </system_role>

    <task_instructions>
    1.  Analyze the provided OCR text segment by segment.
    2.  Identify the "Main Invoice Data" (Vendor, Date, Total, CUPS).
    3.  Identify the "Line Items Table". 
    4.  CRITICAL RULE: In power terms (e.g., "Potencia"), the 'quantity' is the contracted power (kW), NOT the duration (days).
    5.  CRITICAL RULE: If a line has no explicit quantity but has a total (like "Taxes"), set quantity to 1.
    6.  All numeric values must be FLOAT. Remove any non-numeric characters (%, €, $, etc.).
    </task_instructions>

    <field_definitions>
    - cups: The unique Point of Delivery ID (20-22 characters starting with ES).
    - quantity: The magnitude (kWh for energy, kW for power).
    - unit_price: The cost per unit.
    - amount: The final subtotal for that specific line.
    </field_definitions>

    <few_shot_example>
    Input: "Energía Activa Consumida (P1) 120.50 kWh 0.1852 22.32"
    Result: {
        "description": "Energía Activa Consumida (P1)",
        "quantity": 120.50,
        "unit": "kWh",
        "unit_price": 0.1852,
        "amount": 22.32
    }
    </few_shot_example>

    <raw_ocr_text>
    ${rawText}
    </raw_ocr_text>

    Respond ONLY with a JSON object following this schema:
    {
        "vendor_name": string | null,
        "vendor_tax_id": string | null,
        "invoice_number": string | null,
        "date": "YYYY-MM-DD" | null,
        "cups": string | null,
        "total_amount": number,
        "currency": "EUR",
        "period_start": "YYYY-MM-DD" | null,
        "period_end": "YYYY-MM-DD" | null,
        "tax_amount": number | null,
        "lines": [
            {
                "description": "string",
                "quantity": number,
                "unit": "string",
                "unit_price": number,
                "amount": number
            }
        ]
    }
    `;

    try {
        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 3000,
                temperature: 0,
                messages: [{ role: "user", content: prompt }]
            }),
        });

        const response = await client.send(command);
        const resBody = JSON.parse(new TextDecoder().decode(response.body));
        const textResponse = resBody.content[0].text;

        // Robust JSON extraction
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");
        
        return JSON.parse(jsonMatch[0]);

    } catch (error) {
        console.error("❌ [CRITICAL_AGENT_ERROR]:", error);
        return { lines: [], total_amount: 0 }; // Return safe object to avoid pipeline crash
    }
};