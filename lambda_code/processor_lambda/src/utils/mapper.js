import crypto from 'crypto';

export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint, forcedStatus = null) => {
    const now = new Date().toISOString();
    
    // 1. Normalización
    const data = typeof aiData === 'string' ? JSON.parse(aiData) : aiData;
    
    // --- LÓGICA DE ESTADO (DRAFT vs PROCESSED) ---
    // Si pasamos "PENDING_REVIEW", ignoramos la extracción profunda porque aiData solo trae rawText.
    const isDraft = forcedStatus === "PENDING_REVIEW";

    // 2. Extracción de Identificadores (Safe Extraction)
    const vendorTaxId = data.source_data?.vendor?.tax_id;
    const techTaxId = data.technical_ids?.tax_id;
    const invoiceNum = data.source_data?.invoice_number;
    const vendorName = data.source_data?.vendor?.name || "UNKNOWN";

    // 3. Selección de SK (Si es Draft, usamos el timestamp para evitar colisiones)
    const isInvalid = (val) => !val || String(val).includes('HASH_') || val === 'string' || val === 'UNKNOWN';
    
    let finalSK;
    if (isDraft) {
        // Formato: INV#UNKNOWN#NONUM1776359253152
        finalSK = `INV#UNKNOWN#NONUM${Date.now()}`;
    } else {
        const rawIdForSk = !isInvalid(vendorTaxId) ? vendorTaxId : 
                           (!isInvalid(techTaxId) ? techTaxId : vendorName);
        const vendorPart = String(rawIdForSk).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const numberPart = String(invoiceNum || `NONUM-${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        finalSK = `INV#${vendorPart}#${numberPart}`;
    }

    // 4. Atribución de Métricas con Failsafe para Ingesta
    const source = data.source_data || {};
    const meta = data.analytics_metadata || {};
    const extracted = data.extracted_data || {};

    const totalAmountValue = isDraft ? 0 : (source.total_amount?.total_with_tax || source.total_amount || extracted.total_amount || 0);
    const invoiceDate = isDraft ? "0000-00-00" : (source.invoice_date || extracted.invoice_date || "0000-00-00");
    const pStart = isDraft ? null : (source.billing_period?.start || extracted.period_start);
    
    // Manejo de fechas/categoría
    const yearRef = isDraft ? 0 : (meta.year || (pStart ? pStart.split('-')[0] : invoiceDate.split('-')[0]) || 0);
    const monthRef = isDraft ? 0 : (meta.month || (pStart ? pStart.split('-')[1] : invoiceDate.split('-')[1]) || 0);

    const allLines = data.emission_lines || [];
    const totalValue = isDraft ? 0 : allLines.reduce((acc, line) => acc + (Number(line.value) || 0), 0);
    const displayUnit = isDraft ? "kWh" : (allLines[0]?.unit || "kWh");

    // 5. Retorno del objeto compatible con Single Table Design
    return {
        PK: partitionKey,
        SK: finalSK,
        ai_analysis: {
            // CRÍTICO: Guardamos el rawText aquí para que la API de aprobación lo encuentre
            raw_text: data.rawText || null, 
            activity_id: footprint?.activity_id || "genérica",
            calculation_method: "consumption_based",
            confidence_score: isDraft ? 0.7 : (meta.confidence_level === 'HIGH' ? 0.95 : 0.7),
            requires_review: isDraft ? true : (meta.anomaly_flag || totalValue === 0 || !pStart),
            service_type: (data.category || meta.category || "OTHERS").toUpperCase(),
            unit: displayUnit,
            value: totalValue,
            year: parseInt(yearRef)
        },
        analytics_dimensions: {
            period_month: parseInt(monthRef),
            period_year: parseInt(yearRef),
            sector: "COMMERCIAL",
            branch_id: meta.facility_id || "MAIN",
            asset_id: data.technical_ids?.cups || data.technical_ids?.meter_id || "GENERIC_ASSET"
        },
        climatiq_result: {
            co2e: Number(footprint?.total_kg || 0),
            co2e_unit: "kg",
            timestamp: now
        },
        extracted_data: {
            vendor: isDraft ? "UNKNOWN" : vendorName,
            VENDOR_TAX_ID: isDraft ? "PENDING" : (vendorTaxId || techTaxId),
            invoice_number: isDraft ? "PENDING" : invoiceNum,
            invoice_date: invoiceDate,
            total_amount: Number(totalAmountValue),
            billing_period: { 
                start: pStart || "0000-00-00", 
                end: isDraft ? "0000-00-00" : (source.billing_period?.end || "0000-00-00") 
            }
        },
        metadata: {
            s3_key: s3Key,
            status: forcedStatus || "PROCESSED",
            upload_date: now,
            technical_hash: crypto.createHash('sha256').update(s3Key).digest('hex').substring(0, 8),
            thought_process: isDraft ? "Waiting for human validation / Bedrock processing" : data.audit_thought_process
        }
    };
};