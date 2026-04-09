/**
 * Bedrock Prompt Builder - Senior ESG Data Auditor
 * * Este módulo construye un System Prompt dinámico basado en reglas de negocio
 * para forzar la distinción entre importes monetarios y consumos físicos.
 */

import { CATEGORY_RULES } from './bedrock-rules.js';

/**
 * Genera el esquema de metadatos analíticos inyectando valores fijos de la regla.
 */
const getAnalyticsMetadataSchema = (category, rule) => {
    return {
        year: "int (extracted from invoice_date or period)",
        month: "int (1-12)",
        quarter: "string (Q1|Q2|Q3|Q4)",
        is_adjustment: "boolean",
        facility_id: "string",
        facility_name: "string",
        business_unit: "string",
        country_code: "string (ISO_2)",
        scope: rule.scope,
        category: category,
        resource_type: "string (RENEWABLE|FOSSIL|RECYCLED)",
        ghg_protocol_category: "string",
        occupancy_hint: "float (m2 or employees)",
        is_estimated: "boolean",
        confidence_level: "string (HIGH|MEDIUM|LOW)",
        anomaly_flag: "boolean",
        service_id: "string (Meter/Contract ID/CUPS)",
        contract_type: "string (FIXED|INDEXED)",
        is_recurring: "boolean",
        reading_type: "string (ACTUAL|ESTIMATED|CORRECTION)",
        verification_status: "string (PENDING_AUTOMATED)"
    };
};

/**
 * Construye el System Prompt con blindaje anti-alucinación.
 */
export const buildSystemPrompt = (category) => {
    const rule = CATEGORY_RULES[category] || CATEGORY_RULES.OTHERS;
    const allowedUnits = rule.allowed_units || "kWh|m3|L|kg|km|GJ";

    const fullSchema = {
        // Fase de pensamiento interna: Obliga a la IA a "razonar" antes de completar el JSON
        audit_thought_process: {
            detected_raw_values: ["list of all numbers associated with units found"],
            monetary_vs_physical_check: "Detailed explanation of how I separated EUR/Currency from physical consumption",
            missing_data_strategy: "Final decision taken if the specific unit was not found"
        },
        source_data: {
            vendor: { name: "string", tax_id: "string", address: "string" },
            invoice_number: "string",
            invoice_date: "YYYY-MM-DD",
            billing_period: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" },
            currency: "string (ISO_4217)",
            total_amount: { total_with_tax: "float", net: "float" }
        },
        analytics_metadata: getAnalyticsMetadataSchema(category, rule),
        emission_lines: [
            {
                strategy: rule.strategy,
                description: "Exact line text from invoice detailing the consumption",
                value: "float (MANDATORY: Physical quantity. DO NOT PUT MONEY HERE)",
                unit: allowedUnits,
                confidence_score: "float (0.0-1.0)",
                reasoning: "Strict proof: why this value is physical consumption and not a cost or tax",
                period: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" },
                metadata: rule.metadata || {}
            }
        ],
        technical_ids: {
            cups: "string (Only for ELEC/GAS ES)",
            meter_id: "string",
            tax_id: "string (Secondary tax ID if found)"
        }
    };

    return `You are a Senior ESG Data Auditor. Your professional reputation depends on NEVER confusing currency with physical consumption. 

### AUDIT CONTEXT:
- **Target Category**: ${category}
- **Required Physical Units**: [${allowedUnits}]
- **Focus**: ${rule.focus}

### THE "ZERO-HALLUCINATION" PROTOCOL:
1. **IDENTIFY ALL NUMBERS**: Locate every number in the text followed by ${allowedUnits} or symbols like €, EUR, USD, $.
2. **THE MONETARY FILTER**: If a number is adjacent to a currency symbol or labeled as "Total", "Tax", "IVA", "Importe", or "Base", it MUST be excluded from "emission_lines".
3. **ENERGY SPECIFICS**: For ELEC, "Término de potencia" (kW) is a capacity charge. "Energía Activa" (kWh) is the actual consumption. Extract ONLY the latter.
4. **DATE VALIDATION**: Verify that 'invoice_date' is logical. 'billing_period' should usually be 28-31 days long for monthly invoices.

### CATEGORY GUIDANCE:
${category === 'ELEC' ? '- Mandatory: Sum P1, P2, P3 consumption ONLY if they are explicitly in kWh. If a line says "P1 ... 22.32€", ignore the 22.32 for the value field.' : ''}
${category === 'GAS' ? '- If you see "m3" and "kWh", prioritize "kWh" as it represents the energy content used for emissions.' : ''}

### NEGATIVE CONSTRAINTS (STRICT COMPLIANCE):
- NEVER map a value in EUR/Currency to the "emission_lines.value" field.
- NEVER invent or estimate consumption if not present. If missing, return "value": 0 and set "confidence_score": 0.
- NO PROSE, NO CONVERSATION. Return ONLY the JSON object.

### OUTPUT EXAMPLE (STRICT FORMAT):
{
  "audit_thought_process": { 
      "monetary_vs_physical_check": "Identified 80.07 EUR as total amount. Found 145.0 kWh under 'Energía Activa' section. Corrected P1/P2/P3 EUR lines to focus only on kWh totals."
  },
  "source_data": { ... },
  "emission_lines": [{ "value": 145.0, "unit": "kWh", "reasoning": "Value clearly labeled as Active Energy in kWh, distinct from the monetary charges." }]
}

### REQUIRED SCHEMA:
${JSON.stringify(fullSchema, null, 2)}`;
};

export default { buildSystemPrompt };