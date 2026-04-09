import crypto from 'crypto';

/**
 * Mapeador de "Golden Record" 
 * Usa las rutas validadas por el log de index.js
 */
export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const now = new Date().toISOString();
    
    // 1. Normalización (Seguridad por si viene como string)
    const data = typeof aiData === 'string' ? JSON.parse(aiData) : aiData;
    
    // 2. Extracción de Identificadores (Mismas rutas que tus logs exitosos)
    const vendorTaxId = data.source_data?.vendor?.tax_id;
    const techTaxId = data.technical_ids?.tax_id;
    const invoiceNum = data.source_data?.invoice_number;
    const vendorName = data.source_data?.vendor?.name || "UNKNOWN";

    // --- LOG DE DIAGNÓSTICO INTERNO ---
    console.log("======= [MAPPER_INTERNAL_TRACE] =======");
    console.log("A. vendorTaxId Raw:", vendorTaxId);
    console.log("B. techTaxId Raw:", techTaxId);
    console.log("C. invoiceNum Raw:", invoiceNum);
    console.log("D. vendorName Raw:", vendorName);

    // 3. Selección de valor para el SK (Anti-Hash)
    // Buscamos un valor real. Si es undefined o contiene "HASH", saltamos al siguiente.
    const isInvalid = (val) => !val || String(val).includes('HASH_') || val === 'string';

    const rawIdForSk = !isInvalid(vendorTaxId) ? vendorTaxId : 
                       (!isInvalid(techTaxId) ? techTaxId : vendorName);

    // 4. Construcción del Sort Key (SK)
    const vendorPart = String(rawIdForSk)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
    
    const numberPart = String(invoiceNum || `NONUM-${Date.now()}`)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();

    const finalSK = `INV#${vendorPart}#${numberPart}`;

    // --- LOG INTERNO DEL MAPPER ---
    console.log(`>>> [MAPPER_INTERNAL]: TaxID usado: ${rawIdForSk} | SK Final: ${finalSK}`);

    // 5. Atribución Temporal y Categoría
    const source = data.source_data || {};
    const meta = data.analytics_metadata || {};
    const extracted = data.extracted_data || {};

    const totalAmountValue = source.total_amount?.total_with_tax || 
                             source.total_amount || 
                             extracted.total_amount || 0;

    const invoiceDate = source.invoice_date || extracted.invoice_date || "0000-00-00";
    const pStart = source.billing_period?.start || extracted.period_start;
    const yearRef = meta.year || (pStart ? pStart.split('-')[0] : invoiceDate.split('-')[0]) || 0;
    const monthRef = meta.month || (pStart ? pStart.split('-')[1] : invoiceDate.split('-')[1]) || 0;

    const allLines = data.emission_lines || [];
    const totalValue = allLines.reduce((acc, line) => acc + (Number(line.value) || 0), 0);
    const displayUnit = allLines[0]?.unit || "kWh";

    let serviceType = (meta.category || "OTHERS").toUpperCase();
    if (serviceType === "OTHERS" && displayUnit.toLowerCase() === 'kwh') {
        serviceType = "ELEC";
    }

    // 6. Retorno del objeto para DynamoDB
    return {
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
            asset_id: data.technical_ids?.cups || data.technical_ids?.meter_id || "GENERIC_ASSET"
        },
        climatiq_result: {
            co2e: Number(footprint?.total_kg || 0),
            co2e_unit: "kg",
            timestamp: now
        },
        extracted_data: {
            vendor: vendorName,
            VENDOR_TAX_ID: vendorTaxId || techTaxId,
            invoice_number: invoiceNum,
            invoice_date: invoiceDate,
            total_amount: Number(totalAmountValue), // <--- USAMOS LA VARIABLE DEFINIDA ARRIBA
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
};