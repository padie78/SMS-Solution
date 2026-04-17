import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "eu-central-1" });

export const callExtractionAgent = async (rawText) => {
  const prompt = `
    <system_role>
    You are a high-precision extraction engine for ESG (Environmental, Social, and Governance) and Accounting.
    Your goal is to transform messy OCR text from any business document (Utility Invoices, Logistics, Repairs, or Fuel Tickets) into structured JSON.
    </system_role>

    <task_instructions>
    1. CATEGORIZATION: Identify the service type: ELECTRICITY, GAS, WATER, LOGISTICS, MAINTENANCE, or FUEL.
    2. ENTITY IDENTIFICATION: Extract BOTH the Vendor (issuer) and the Customer (receiver/client).
    3. CRITICAL RULE - QUANTITY:
       - For Power (Potencia): quantity is kW.
       - For Energy/Gas: quantity is kWh or m3.
       - For Fuel: quantity is Liters.
       - For Logistics: quantity is km, kg, or units.
       - Do NOT use "days" or "duration" as quantity.
    4. NUMERIC PRECISION: All amounts must be FLOAT. Extract 'base_amount' (total before taxes) and 'tax_amount' separately.
    </task_instructions>

    <field_definitions>
    - cups: Point of Delivery ID (Electricity/Gas).
    - plate_number: Vehicle license plate (for Repairs or Fuel tickets).
    - quantity: The technical magnitude (kWh, kW, Liters, km).
    - unit_price: Price per unit.
    - base_amount: Sum of all lines before taxes.
    </field_definitions>

    <raw_ocr_text>
    ${rawText}
    </raw_ocr_text>

    Respond ONLY with a JSON object following this schema:
    {
        "service_category": "ELECTRICITY" | "GAS" | "LOGISTICS" | "MAINTENANCE" | "FUEL" | "OTHERS",
        "vendor_name": string | null,
        "vendor_tax_id": string | null,
        "customer_name": string | null,
        "customer_tax_id": string | null,
        "invoice_number": string | null,
        "date": "YYYY-MM-DD" | null,
        "cups": string | null,
        "plate_number": string | null,
        "total_amount": number,
        "base_amount": number,
        "tax_amount": number,
        "currency": "EUR" | "USD" | "GBP",
        "period_start": "YYYY-MM-DD" | null,
        "period_end": "YYYY-MM-DD" | null,
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