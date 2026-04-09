import crypto from 'crypto';

/**
 * Mapeador de "Golden Record" - Versión Final con Blindaje de SK
 */
export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const now = new Date().toISOString();
    
    // 1. Normalización
    const data = typeof aiData === 'string' ? JSON.parse(aiData) : aiData;
    
    const source = data.source_data || {};
    const meta = data.analytics_metadata || {};
    const techIds = data.technical_ids || {};
    const extracted = data.extracted_data || {};

    // 2. Extracción de Identificadores (Basado en tu log de Bedrock OK)
    const rawTaxId = source.vendor?.tax_id || 
                     techIds.tax_id || 
                     extracted.VENDOR_TAX_ID || 
                     null;

    const vendorName = source.vendor?.name || 
                       extracted.vendor || 
                       "UNKNOWN";

    const invoiceNum = source.invoice_number || 
                       extracted.invoice_number || 
                       `NONUM-${Date.now()}`;

    // 3. Construcción del SK
    // Forzamos que si rawTaxId contiene la palabra "HASH", use el vendorName como fallback
    const validTaxId = (rawTaxId && !String(rawTaxId).includes('HASH') && rawTaxId !== 'string') 
                       ? rawTaxId 
                       : vendorName;
    
    const vendorPart = String(validTaxId)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase() || "UNIDENTIFIED";
    
    const numberPart = String(invoiceNum)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();

    let finalSK = `INV#${vendorPart}#${numberPart}`;

    // --- BLOQUEO DE EMERGENCIA ---
    // Si por alguna razón extraña el SK todavía tiene un hash aquí, lo limpiamos manualmente
    if (finalSK.includes('HASH_')) {
        console.warn("⚠️ [MAPPER_WARNING]: Se detectó un hash intruso en el SK. Limpiando...");
        finalSK = finalSK.replace(/HASH_[a-f0-9]{8}/i, 'MANUAL_CLEAN');
    }

    // 4. Atribución Temporal
    const invoiceDate = source.invoice_date || extracted.invoice_date || "0000-00-00";
    const pStart = source.billing_period?.start || extracted.period_start;
    const yearRef = meta.year || (pStart ? pStart.split('-')[0] : invoiceDate.split('-')[0]) || 0;
    const monthRef = meta.month || (pStart ? pStart.split('-')[1] : invoiceDate.split('-')[1]) || 0;

    // 5. Consumo y Categoría
    const allLines = data.emission_lines || [];
    const totalValue = allLines.reduce((acc, line) => acc + (Number(line.value) || 0), 0);
    const displayUnit = allLines[0]?.unit || "kWh";

    let serviceType = (meta.category || "OTHERS").toUpperCase();
    if (serviceType === "OTHERS" && displayUnit.toLowerCase() === 'kwh') {
        serviceType = "ELEC";
    }

    // 6. Retorno del objeto
    const record = {
        PK: partitionKey,
        SK: finalSK,
        ai_analysis: {
            activity_id: footprint?.activity_id || "genérica",
            calculation_method: "consumption_based",
            confidence_score: meta.confidence_level === 'HIGH' ? 0.95 : 0.7,
            requires_review: meta.anomaly_flag || totalValue === 0 || !pStart,
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
            asset_id: techIds.cups || techIds.meter_id || "GENERIC_ASSET"
        },
        climatiq_result: {
            co2e: Number(footprint?.total_kg || 0),
            co2e_unit: "kg",
            timestamp: now
        },
        extracted_data: {
            vendor: vendorName,
            VENDOR_TAX_ID: rawTaxId,
            total_amount: Number(source.total_amount?.total_with_tax || 0),
            invoice_date: invoiceDate,
            billing_period: { start: pStart, end: source.billing_period?.end }
        },
        metadata: {
            s3_key: s3Key,
            status: "PROCESSED",
            upload_date: now,
            technical_hash: crypto.createHash('sha256').update(s3Key).digest('hex').substring(0, 8),
            thought_process: data.audit_thought_process
        }
    };

    console.log(`[MAPPER_FINAL_CHECK] SK: ${record.SK}`);
    return record;
};