const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

// Configuración del cliente con optimización para Warm Starts
const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    maxAttempts: 3
});

/**
 * Servicio de Auditoría ESG mediante GenAI (Claude 3 Haiku).
 * Transforma OCR ruidoso en el "Golden Record" para DynamoDB.
 * * @param {Object} extraction - { rawText, queryHints, category }
 * @returns {Promise<Object>} - Payload listo para el Mapper y las tablas de BD.
 */
exports.analyzeInvoice = async (extraction) => {
    const { rawText, queryHints, category } = extraction;

    console.log(`   [BEDROCK_START]: Generando auditoría técnica para categoría: ${category}`);

    // 1. Lógica de Enfoque por Categoría (Context Injection)
    const focusInstructions = {
        ELEC: "Scope 2. Focus: Active Energy (kWh). Identify CUPS as facility_id.",
        GAS: "Scope 1. Focus: Natural Gas (kWh/m3). Identify Meter ID.",
        LOGISTICS: "Scope 3. Focus: Weight (kg/t) and Distance (km). Identify Plate/Route.",
        REFRIGERANTS: "Scope 1. Focus: GWP-High Gases (R-410A, etc.) and recharge weight.",
        FLEET: "Scope 1. Focus: Fuel Volume (Liters) and Plate/Vehicle ID.",
        WASTE: "Scope 3. Focus: Waste Type and Treatment (Recycling/Landfill).",
        WATER: "Environmental KPI. Focus: Volume in m3.",
        CLOUDOPS: "Scope 3. Focus: Cloud Region and Spend/Usage.",
        OTHERS: "General Audit: Extract any measurable consumption and vendor ID."
    };

    const currentFocus = focusInstructions[category] || focusInstructions.OTHERS;

    // 2. System Prompt: El contrato entre la IA y tu base de datos
    const systemPrompt = `
You are a Senior ESG Data Auditor. Mission: Extract data to feed a DynamoDB Single-Table SMS.

### CATEGORY CONTEXT:
Auditing a ${category} invoice. Focus: ${currentFocus}

### CORE OPERATIONAL RULES:
1. MULTI-ITEM: Separate each emission source into the "emission_lines" array.
2. ANCHORS: Use QUERY HINTS for financial values, Tax IDs, and Invoice Numbers.
3. TEMPORAL: Extract 'billing_period' and 'invoice_date' (YYYY-MM-DD).
4. ANALYTICS DIMS: Identify "facility_id" from CUPS, addresses, or internal IDs.
5. NO PROSE: Output ONLY valid JSON.
6. DATA TYPES: Numbers must be float/int, never strings.

### REQUIRED OUTPUT SCHEMA (DynamoDB-Ready):
{
  "source_data": {
    "vendor": { "name": "string", "tax_id": "string", "address": "string" },
    "invoice_number": "string",
    "invoice_date": "YYYY-MM-DD",
    "billing_period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
    "currency": "ISO_4217",
    "amounts": { "total_with_tax": float, "net": float }
  },
  "analytics_metadata": {
    // --- TEMPORAL ---
    "year": int,
    "month": "MM",
    "quarter": "Q1|Q2|Q3|Q4",
    "is_adjustment": boolean, // Indica si es una factura rectificativa de meses anteriores

    // --- GEOGRÁFICO & ESTRUCTURAL ---
    "facility_id": "string",     // ID de la planta/sede (extraído de CUPS/Dirección)
    "facility_name": "string",   // Nombre legible para el Dashboard
    "business_unit": "string",   // Depto: "Manufactura", "Logística", "Oficinas"
    "country_code": "ISO_2",
    "region_state": "string",    // Para impuestos al carbono locales (ej: "Andalucía", "Texas")

    // --- CLASIFICACIÓN ESG ---
    "scope": "SCOPE_1|SCOPE_2|SCOPE_3",
    "category": "string",        // Ej: "ELECTRICITY", "STATIONARY_COMBUSTION"
    "resource_type": "string",   // Ej: "RENEWABLE", "FOSSIL", "RECYCLED"
    "ghg_protocol_category": "string", // Cat 1-15 para Scope 3 (Vital para auditoría)

    // --- MÉTRICAS DE INTENSIDAD (Para Benchmarking) ---
    "occupancy_hint": float,     // Si la factura menciona m2, empleados o noches de hotel
    "is_estimated": boolean,     // Detectar si la factura es una "Lectura Estimada" vs "Real"

    // --- AUDIT & TRUST ---
    "confidence_level": "HIGH|MEDIUM|LOW",
    "anomaly_flag": boolean,      // ¿El consumo parece fuera de rango para esta facility?

    // --- IDENTIFICACIÓN DE ACTIVO (CRÍTICO) ---
    "service_id": "string",      // CUPS, Número de Medidor, Serial de Activo
    "contract_type": "string",   // "FIXED", "INDEXED", "SINGLE_PAYMENT"

    // --- COMPORTAMIENTO FINANCIERO ---
    "is_recurring": boolean,     // true para consumos mensuales, false para multas o reparaciones
    "billing_frequency": "MONTHLY|QUARTERLY|ANNUAL",

    // --- VALIDACIÓN DE INTEGRIDAD ---
    "reading_type": "ACTUAL|ESTIMATED|CORRECTION", // Más preciso que solo is_estimated
    "verification_status": "PENDING_AUTOMATED"     // Estado inicial para tu flujo de estados
  },
  "emission_lines": [
    {
        "strategy": "ELEC", 
        "description": "Consumo de Energía Activa - Periodo Valle",
        "value": 1250.8,
        "unit": "kWh",
        "confidence_score": 0.98,
        "reasoning": "Se extrajo del apartado de detalle de facturación, concepto Energía Activa P3.",
        "period": { "start": "2026-01-01", "end": "2026-01-31" }, // <--- Vital para STATS#
        "metadata": {
        "meter_id": "ES0021000000000000XX",
        "is_renewable": true,        // <--- Alimenta tu tag RENEWABLE_CERTIFIED
        "is_estimated_reading": false, // <--- Evita ruido en analítica
        "tariff_name": "2.0TD",
        "voltage_level": "LOW"       // <--- Cambia el factor de pérdida eléctrica
        }
    }
    ]
}`;

    // 3. Payload de ejecución
    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2500,
        temperature: 0,
        system: systemPrompt,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `QUERY HINTS:\n${JSON.stringify(queryHints, null, 2)}\n\nRAW TEXT:\n${rawText}`
                    }
                ]
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

        // Limpieza de Markdown y parsing final
        let resultText = responseBody.content[0].text.trim();
        if (resultText.startsWith("```json")) {
            resultText = resultText.replace(/```json|```/g, "").trim();
        }

        const finalData = JSON.parse(resultText);

        console.log(`   [BEDROCK_END]: Auditoría finalizada para ${finalData.source_data.vendor.name || 'Vendor desconocido'}`);
        return finalData;

    } catch (error) {
        console.error(`❌ [BEDROCK_CRITICAL_ERROR]:`, error.message);
        throw new Error(`Failed AI Audit: ${error.message}`);
    }
};