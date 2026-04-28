/**
 * Bedrock Prompt Builder - Senior ESG Data Auditor
 * Optimizado para desgloses atómicos y captura de datos financieros (IVA/Base).
 */

import { CATEGORY_RULES } from './bedrock_rules.js';

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
 * Construye el System Prompt con blindaje anti-alucinación y desglose atómico.
 */
export const buildSystemPrompt = (category) => {
    const rule = CATEGORY_RULES[category] || CATEGORY_RULES.OTHERS;
    const allowedUnits = rule.allowed_units || "kWh|m3|L|kg|km|GJ";

    const fullSchema = {
        audit_thought_process: {
            detected_raw_values: ["List of all numeric blocks found (e.g., 'Energía P1: 120.5 kWh', 'IVA: 13.90€')"],
            financial_extraction_map: "Step-by-step logic to identify Net Amount (Base Imponible) and Tax (IVA)",
            atomic_line_inventory: "Confirmation of every line item found in the consumption tables"
        },
        source_data: {
            vendor: { name: "string", tax_id: "string", address: "string" },
            invoice_number: "string",
            invoice_date: "YYYY-MM-DD",
            billing_period: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" },
            currency: "string (ISO_4217)",
            total_amount: { 
                total_with_tax: "float", 
                net_amount: "float (Sum of concepts/Base Imponible)", 
                tax_amount: "float (Total IVA/Tax amount)" 
            }
        },
        analytics_metadata: getAnalyticsMetadataSchema(category, rule),
        emission_lines: [
            {
                strategy: rule.strategy,
                description: "Original line text (e.g., 'Energía Activa P1 (Punta)')",
                value: "float (Physical quantity. DO NOT PUT MONEY HERE)",
                unit: allowedUnits,
                monetary_cost: "float (The cost in currency for THIS specific line)",
                confidence_score: "float (0.0-1.0)",
                reasoning: "Detailed proof: why this is a physical consumption line",
                period: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" },
                metadata: rule.metadata || {}
            }
        ],
        technical_ids: {
            cups: "string (For ELEC/GAS ES)",
            meter_id: "string",
            tax_id: "string"
        }
    };

    return `You are a Senior ESG Data Auditor specializing in high-precision digitization.

### THE "ATOMIC EXTRACTION" PROTOCOL:
1. **NO CONSOLIDATION**: Do NOT sum period consumption (e.g., P1, P2, P3). Every individual row in the invoice detail must be its own object in the 'emission_lines' array.
2. **FINANCIAL INTEGRITY**: Locate "Base Imponible" (Net) and "I.V.A." (Tax). These are mandatory fields in 'source_data.total_amount'.
3. **CURRENCY VS PHYSICS**: 
   - Identify every number followed by symbols like €, EUR, or labels like "Importe".
   - Place costs in 'monetary_cost' and physical units (${allowedUnits}) in 'value'.
4. **POWER VS ENERGY**: For ELEC, "Potencia" (kW) is a capacity charge. "Energía" (kWh) is consumption. Map BOTH if they appear in the detail, but ensure 'value' uses the correct unit.

### CATEGORY GUIDANCE (${category}):
${category === 'ELEC' ? '- Mandatory: Extract P1, P2, and P3 separately. If a value is 0 but present in the table, extract it anyway.' : ''}
${category === 'ELEC' ? '- Look for "CUPS" (20-22 chars starting with ES) and map to technical_ids.cups.' : ''}

### NEGATIVE CONSTRAINTS:
- NEVER map currency to the "value" field.
- NEVER skip lines that are part of the main consumption or power tables.
- Return ONLY valid JSON. No conversational filler.

### OUTPUT EXAMPLE:
{
  "audit_thought_process": { 
      "atomic_line_inventory": "Found 3 consumption lines (P1, P2, P3) and 2 power lines." 
  },
  "source_data": { 
      "total_amount": { "total_with_tax": 80.07, "net_amount": 66.17, "tax_amount": 13.90 } 
  },
  "emission_lines": [
      { "description": "Energía Activa P1", "value": 120.5, "unit": "kWh", "monetary_cost": 22.10 },
      { "description": "Energía Activa P3", "value": 250.0, "unit": "kWh", "monetary_cost": 15.05 }
  ]
}

### REQUIRED JSON SCHEMA:
${JSON.stringify(fullSchema, null, 2)}`;
};

export default { buildSystemPrompt };