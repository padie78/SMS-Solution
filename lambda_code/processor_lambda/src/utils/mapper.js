import crypto from 'crypto';

/**
 * Mapeador de "Golden Record" - Versión Blindada
 * Resuelve el error de HASH en SK y fuerza la categoría ELEC si detecta kWh.
 */
export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const now = new Date().toISOString();
    
    // 1. Logs de Debug (Míralos en CloudWatch si el SK sigue fallando)
    console.log(`[MAPPER_START]: Procesando ${s3Key}`);

    // 2. Normalización de entrada (Soporte para objeto directo o string)
    const data = typeof aiData === 'string' ? JSON.parse(aiData) : aiData;
    
    const source = data.source_data || {};
    const meta = data.analytics_metadata || {};
    const extracted = data.extracted_data || {};
    const vendor = source.vendor || {};

    // 3. Extracción de Identificadores (Sin posibilidad de HASH externo)
    // Buscamos Tax ID con fallback agresivo
    const rawTaxId = vendor.tax_id || 
                     data.technical_ids?.tax_id || 
                     extracted.VENDOR_TAX_ID || 
                     extracted.tax_id || 
                     "NOTAXID";

    const vendorName = (typeof vendor === 'object' ? vendor.name : null) || 
                       extracted.vendor || 
                       "UNKNOWNVENDOR";

    const invoiceNum = source.invoice_number || 
                       extracted.invoice_number || 
                       `NONUM-${Date.now()}`;

    // 4. Construcción del Sort Key (SK) - Lógica limpia
    // Reemplazamos caracteres no alfanuméricos para evitar errores en Dynamo
    const vendorPart = String(rawTaxId !== "NOTAXID" ? rawTaxId : vendorName)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
    
    const numberPart = String(invoiceNum)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();

    // El SK final se construye aquí. Si sale HASH es porque vino en el string original.
    const SK = `INV#${vendorPart}#${numberPart}`;

    // 5. Lógica de Atribución Temporal
    const invoiceDate = source.invoice_date || extracted.invoice_date || "0000-00-00";
    const pStart = source.billing_period?.start || extracted.period_start;

    const yearRef = meta.year || (pStart ? pStart.split('-')[0] : invoiceDate.split('-')[0]) || 0;
    const monthRef = meta.month || (pStart ? pStart.split('-')[1] : invoiceDate.split('-')[1]) || 0;

    // 6. Procesamiento de Consumo y Categoría (AUTO-CORRECCIÓN)
    const allLines = data.emission_lines || [];
    const totalValue = allLines.reduce((acc, line) => acc + (Number(line.value) || 0), 0);
    const displayUnit = allLines[0]?.unit || "kWh";

    // Si la IA dice OTHERS pero hay kWh, forzamos ELEC
    let serviceType = (meta.category || extracted.service_type || "OTHERS").toUpperCase();
    if (serviceType === "OTHERS" && displayUnit.toLowerCase() === 'kwh') {
        serviceType = "ELEC";
    }

    // 7. Lógica de Revisión
    const confidence = meta.confidence_level === 'HIGH' ? 0.95 : (parseFloat(data.confidence_score) || 0.7);
    const needsReview = meta.anomaly_flag || totalValue === 0 || !pStart;

    // 8. Retorno del Objeto Final
    return {
        PK: partitionKey,
        SK: SK,

        ai_analysis: {
            activity_id: footprint?.activity_id || "genérica",
            calculation_method: "consumption_based",
            confidence_score: confidence,
            requires_review: needsReview,
            service_type: serviceType,
            unit: displayUnit,
            value: totalValue,
            year: parseInt(yearRef)
        },

        analytics_dimensions: {
            period_month: parseInt(monthRef),
            period_year: parseInt(yearRef),
            sector: "COMMERCIAL",
            branch_id: meta.facility_id || "MAIN",
            asset_id: meta.service_id || "GENERIC_ASSET"
        },

        climatiq_result: {
            co2e: Number(footprint?.total_kg || 0),
            co2e_unit: "kg",
            timestamp: now,
            audit_trail: footprint?.items || [] 
        },

        extracted_data: {
            vendor: vendorName,
            VENDOR_TAX_ID: rawTaxId,
            total_amount: Number(source.total_amount?.total_with_tax || extracted.total_amount || 0),
            invoice_date: invoiceDate,
            billing_period: { start: pStart, end: source.billing_period?.end || extracted.period_end },
            location: source.location || { country: meta.country_code || "ES" }
        },

        metadata: {
            filename: s3Key.split('/').pop(),
            s3_key: s3Key,
            status: "PROCESSED",
            upload_date: now,
            technical_hash: crypto.createHash('sha256').update(s3Key).digest('hex').substring(0, 8),
            thought_process: data.audit_thought_process || meta.reasoning
        }
    };
};