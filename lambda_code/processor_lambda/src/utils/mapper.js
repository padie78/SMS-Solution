import crypto from 'crypto';

export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const now = new Date().toISOString();
    
    // --- NUEVO MAPEO PARA EL PROMPT SENIOR ---
    // En lugar de aiData.extracted_data, usamos los nuevos bloques:
    const source = aiData.source_data || {};
    const meta = aiData.analytics_metadata || {};
    const vendor = source.vendor || {};
    
    // 1. Extraemos la data para compatibilidad
    const invoiceDate = source.invoice_date || "0000-00-00";
    // El nuevo prompt usa billing_period.start en lugar de period_start
    const pStart = source.billing_period?.start; 
    const pEnd = source.billing_period?.end;
    const vendorName = vendor.name || "UNKNOWN_VENDOR";
    const taxId = vendor.tax_id || aiData.technical_ids?.tax_id || "NO_TAX_ID";

    // 2. Lógica de Atribución Temporal (Usamos los datos de analytics_metadata que ya vienen limpios)
    const yearRef = meta.year || (pStart ? pStart.split('-')[0] : invoiceDate.split('-')[0]);
    const monthRef = meta.month || (pStart ? pStart.split('-')[1] : invoiceDate.split('-')[1]);

    // 3. Generación de SK de Factura
    const vendorClean = (taxId !== "NO_TAX_ID" ? taxId : vendorName)
        .replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const numberClean = (source.invoice_number || "NONUM")
        .replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    const SK = `INV#${vendorClean}#${numberClean}`;

    // 4. Procesamiento de Líneas de Consumo
    const allLines = aiData.emission_lines || [];
    // Sumamos todos los valores físicos de las líneas encontradas
    const totalValue = allLines.reduce((acc, line) => acc + (Number(line.value) || 0), 0);
    const displayUnit = allLines[0]?.unit || "kWh";

    // 5. Lógica de Revisión y Confianza
    const confidence = meta.confidence_level === 'HIGH' ? 0.95 : 0.7;
    const hasDates = !!(pStart && pEnd);
    const needsReview = meta.anomaly_flag || totalValue === 0 || !hasDates;

    return {
        PK: partitionKey,
        SK: SK,

        ai_analysis: {
            activity_id: footprint.activity_id || "genérica",
            calculation_method: "consumption_based",
            confidence_score: confidence,
            requires_review: needsReview,
            service_type: (meta.category || "ELEC").toUpperCase(),
            unit: displayUnit,
            value: totalValue,
            year: parseInt(yearRef) || 0
        },

        analytics_dimensions: {
            period_month: parseInt(monthRef) || 0,
            period_year: parseInt(yearRef) || 0,
            sector: "COMMERCIAL",
            branch_id: meta.facility_id || "MAIN",
            asset_id: meta.service_id || "GENERIC_ASSET"
        },

        climatiq_result: {
            co2e: Number(footprint.total_kg || 0),
            co2e_unit: "kg",
            timestamp: now
        },

        // Mantenemos extraído para que db.js no rompa, pero con la data nueva
        extracted_data: {
            vendor: vendorName,
            VENDOR_TAX_ID: taxId,
            total_amount: Number(source.total_amount?.total_with_tax || 0),
            invoice_date: invoiceDate,
            location: source.location || { country: meta.country_code || "ES" }
        },

        metadata: {
            filename: s3Key.split('/').pop(),
            s3_key: s3Key,
            status: "PROCESSED",
            upload_date: now,
            technical_hash: crypto.createHash('sha256').update(s3Key).digest('hex').substring(0, 8),
            // Guardamos el pensamiento de la IA por si hay que auditar errores
            thought_process: aiData.audit_thought_process
        }
    };
};