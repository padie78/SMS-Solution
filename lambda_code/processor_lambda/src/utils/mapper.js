const crypto = require("crypto");

/**
 * Transforma los resultados de IA y Cálculos en el esquema de DynamoDB de Diego.
 * Soporta múltiples líneas de emisión y metadatos de auditoría.
 */
exports.buildGoldenRecord = (orgId, key, ai, calc) => {
    const now = new Date().toISOString();
    const fileHash = crypto.createHash('sha256').update(key).digest('hex');
    
    // Usamos los dims que extrajo Bedrock (year, month, facility)
    const { year, month, facility, country, category } = ai.dims;
    const { vendor, invoice_number, total_amount_net, currency } = ai.extracted_data;

    return {
        PK: `ORG#${orgId}`,
        // SK única: Tipo # Fecha # Hash_Corto # Random para evitar colisiones en re-procesos
        SK: `FAC#${now.split('T')[0]}#${fileHash.substring(0, 8)}`,
        
        analytics_dims: {
            year: parseInt(year),
            month: month, // "MM"
            quarter: `Q${Math.ceil(parseInt(month) / 3)}`,
            facility_id: facility || "UNKNOWN_PLANT",
            country_code: country || "ISO",
            business_unit: ai.dims.business_unit || "General",
            category: category || "OTHER",
            scope: category === 'ELEC' ? 'SCOPE_2' : 'SCOPE_1'
        },

        metrics: {
            co2e_tons: calc.total_tons, // Ya convertido en climatiq.js
            consumption_value: total_amount_net || 0,
            consumption_unit: ai.emission_lines[0]?.unit || "unit",
            // Ratio de intensidad: CO2 por cada unidad de moneda gastada
            intensity_metric: total_amount_net > 0 ? (calc.total_tons / total_amount_net) : 0,
            is_anomaly: false // Lógica de umbrales se puede aplicar aquí
        },

        audit_trail: {
            uploaded_by: "SYSTEM_PIPELINE_V2",
            created_at: now,
            hash_integrity: fileHash,
            is_manual_review_required: ai.emission_lines.some(l => l.confidence_score < 0.7),
            bedrock_model: "claude-3-haiku-2025"
        },

        // Data cruda de la factura para visualización en UI
        source_data: {
            vendor_name: vendor.name,
            vendor_tax_id: vendor.tax_id,
            invoice_number: invoice_number,
            currency: currency,
            s3_key: key,
            billing_period: ai.extracted_data.billing_period
        },

        // Guardamos el desglose de Climatiq por si hay que auditar línea por línea
        emission_items: calc.items 
    };
};