import crypto from 'crypto';

export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint, forcedStatus = null) => {
    const now = new Date().toISOString();
    const data = typeof aiData === 'string' ? JSON.parse(aiData) : aiData;
    const isDraft = forcedStatus === "PENDING_REVIEW";

    // 1. Lógica de Sort Key (SK) - Blindada contra nulos
    let finalSK;
    if (isDraft) {
        finalSK = `INV#UNKNOWN#NONUM${Date.now()}`;
    } else {
        const vendorTaxId = data.source_data?.vendor?.tax_id;
        const techTaxId = data.technical_ids?.tax_id;
        const invoiceNum = data.source_data?.invoice_number;
        const vendorName = data.source_data?.vendor?.name || "UNKNOWN";

        const isInvalid = (val) => !val || String(val).includes('HASH_') || val === 'string' || val === 'UNKNOWN';
        const rawIdForSk = !isInvalid(vendorTaxId) ? vendorTaxId : (!isInvalid(techTaxId) ? techTaxId : vendorName);
        
        const vendorPart = String(rawIdForSk).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const numberPart = String(invoiceNum || `NONUM-${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        finalSK = `INV#${vendorPart}#${numberPart}`;
    }

    // 2. Normalización de Referencias Temporales
    const source = data.source_data || {};
    const meta = data.analytics_metadata || {};
    const pStart = isDraft ? null : (source.billing_period?.start || data.extracted_data?.period_start);
    const invoiceDate = isDraft ? "0000-00-00" : (source.invoice_date || "0000-00-00");

    // Aseguramos que nunca sea NaN para DynamoDB
    const yearRef = parseInt(isDraft ? 0 : (meta.year || pStart?.split('-')[0] || invoiceDate.split('-')[0] || 0));
    const monthRef = parseInt(isDraft ? 0 : (meta.month || pStart?.split('-')[1] || invoiceDate.split('-')[1] || 0));

    // 3. Cálculos de Consumo
    const allLines = data.emission_lines || [];
    const totalValue = isDraft ? 0 : allLines.reduce((acc, line) => acc + (Number(line.value) || 0), 0);
    const displayUnit = isDraft ? "kWh" : (allLines[0]?.unit || "kWh");

    return {
        PK: partitionKey,
        SK: finalSK,
        ai_analysis: {
            raw_text: data.rawText || null, // Insumo vital para la Fase 2 (Bedrock)
            activity_id: footprint?.activity_id || "genérica",
            calculation_method: "consumption_based",
            confidence_score: isDraft ? 0.7 : (meta.confidence_level === 'HIGH' ? 0.95 : 0.7),
            requires_review: isDraft ? true : !!(meta.anomaly_flag || totalValue === 0 || !pStart),
            service_type: (data.category || meta.category || "ELEC").toUpperCase(),
            unit: displayUnit,
            value: totalValue,
            year: yearRef
        },
        analytics_dimensions: {
            period_month: monthRef,
            period_year: yearRef,
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
            vendor: isDraft ? "UNKNOWN" : (source.vendor?.name || "UNKNOWN"),
            VENDOR_TAX_ID: isDraft ? "PENDING" : (source.vendor?.tax_id || "PENDING"),
            invoice_number: isDraft ? "PENDING" : (source.invoice_number || "PENDING"),
            invoice_date: invoiceDate,
            total_amount: Number(isDraft ? 0 : (source.total_amount?.total_with_tax || source.total_amount || 0)),
            billing_period: { 
                start: pStart || "0000-00-00", 
                end: isDraft ? "0000-00-00" : (source.billing_period?.end || "0000-00-00") 
            }
        },
        metadata: {
            s3_key: s3Key,
            status: forcedStatus || "PROCESSED",
            is_draft: isDraft,
            upload_date: now,
            technical_hash: crypto.createHash('sha256').update(s3Key).digest('hex').substring(0, 8),
            thought_process: isDraft ? "Waiting for human validation / Bedrock processing" : (data.audit_thought_process || "N/A")
        },
        processed_at: now,
        total_days_prorated: 0 // Se calcula solo en la API de aprobación
    };
};