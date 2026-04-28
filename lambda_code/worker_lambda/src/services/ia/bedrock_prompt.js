/**
 * Bedrock Prompt Builder - Senior ESG Data Auditor
 * Optimizado para desgloses atómicos, captura de datos financieros (IVA/Base)
 * y metadatos de suministro (CUPS, CIF, Tarifa).
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
        service_id: "string (Meter/Contract ID/CUPS/Reference)",
        contract_type: "string (FIXED|INDEXED|Tarifa e.g. 2.0TD)",
        is_recurring: "boolean",
        reading_type: "string (ACTUAL|ESTIMATED|CORRECTION)",
        verification_status: "string (PENDING_AUTOMATED)"
    };
};

/**
 * Construye el System Prompt con blindaje anti-alucinación y escaneo de cabecera.
 */
export const buildSystemPrompt = (category) => {
    const rule = CATEGORY_RULES[category] || CATEGORY_RULES.OTHERS;
    const allowedUnits = rule.allowed_units || "kWh|m3|L|kg|km|GJ";

    const fullSchema = {
        audit_thought_process: {
            header_scan_results: "Brief summary of found CUPS, Tax IDs (CIF/NIF), and Customer info",
            detected_raw_values: ["List of all numeric blocks found (e.g., 'Energía P1: 120.5 kWh', 'IVA: 13.90€')"],
            financial_extraction_map: "Step-by-step logic to identify Net Amount (Base Imponible) and Tax (IVA)",
            atomic_line_inventory: "Confirmation of every line item found in the consumption tables (P1, P2, P3, etc.)"
        },
        source_data: {
            vendor: { 
                name: "string", 
                tax_id: "string (CIF of the utility company)", 
                address: "string" 
            },
            customer: {
                name: "string (Titular)",
                tax_id: "string (CIF/NIF of the customer)",
                address: "string (Suministro/Fiscal address)"
            },
            invoice_number: "string",
            invoice_date: "YYYY-MM-DD",
            billing_period: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" },
            currency: "string (ISO_4217)",
            total_amount: { 
                total_with_tax: "float", 
                net_amount: "float (Base Imponible)", 
                tax_amount: "float (Total IVA/Tax amount)" 
            }
        },
        analytics_metadata: getAnalyticsMetadataSchema(category, rule),
        emission_lines: [
            {
                strategy: rule.strategy,
                description: "Original line text (e.g., 'Energía Activa P1')",
                value: "float (Physical quantity. MANDATORY: DO NOT PUT MONEY HERE)",
                unit: "string (kWh, kW, kW/día, m3, etc.)",
                monetary_cost: "float (The cost associated with THIS specific line)",
                confidence_score: "float (0.0-1.0)",
                reasoning: "Detailed proof: why this is a physical line and its role",
                period: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
            }
        ],
        technical_ids: {
            cups: "string (MANDATORY for ELEC/GAS ES: starts with ES...)",
            meter_id: "string",
            contract_reference: "string",
            tariff: "string (e.g., 2.0TD)"
        }
    };

    return `You are a Senior ESG Data Auditor. Your mission is high-precision digitization of utility invoices.

### THE "MASTER DATA & HEADER" PROTOCOL:
1. **HEADER SCAN**: Before looking at costs, locate Supply Details:
   - **CUPS**: Look for a string starting with 'ES' followed by 20-22 characters. This MUST be in 'technical_ids.cups'.
   - **CIF/NIF**: Identify the Customer/Titular Tax ID (e.g., B-87654321).
   - **TARIFA**: Identify the tariff type (e.g., 2.0TD, 3.0TD) and place it in 'technical_ids.tariff'.

### THE "ATOMIC EXTRACTION" PROTOCOL:
1. **FULL TABLE REPLICATION**: You must extract EVERY row from the invoice detail table. If the invoice shows P1, P2, and P3, return 3 lines, even if a value is 0.
2. **ZERO-VALUE INCLUSION**: Do not skip lines with 0.0 value or 0.0 cost. 
3. **POWER VS ENERGY**: For ELEC, distinguish "Potencia" (kW or kW/día) from "Energía" (kWh). Both are required if present in the detail.
4. **FINANCIAL INTEGRITY**: Locate "Base Imponible" (Net) and "I.V.A." (Tax). These are mandatory for 'source_data.total_amount'.

### CATEGORY GUIDANCE (${category}):
${category === 'ELEC' ? '- Mandatory: Extract P1, P2, and P3 separately for both Power (Potencia) and Energy (Energía) if they appear.' : ''}
${category === 'ELEC' ? '- CUPS is the unique identifier for Spanish electricity. Ensure it is extracted accurately.' : ''}

### NEGATIVE CONSTRAINTS:
- NEVER map currency/money to the "value" field. Use "monetary_cost" for that.
- NO CONSOLIDATION: P1+P2+P3 must NOT be summed.
- Return ONLY valid JSON.

### REQUIRED SCHEMA:
${JSON.stringify(fullSchema, null, 2)}`;
};

export default { buildSystemPrompt };