import crypto from 'crypto';

/**
 * Mapeador de "Golden Record" - Versión Final Consolidada
 * Alineado con el System Prompt del Auditor ESG.
 */
export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const now = new Date().toISOString();
    
    // 1. Normalización de la entrada (Soporte para string de Bedrock o objeto)
    const data = typeof aiData === 'string' ? JSON.parse(aiData) : aiData;
    
    // Alias para facilitar acceso siguiendo el esquema del Prompt
    const source = data.source_data || {};
    const meta = data.analytics_metadata || {};
    const extracted = data.extracted_data || {}; // Por si la IA usa este campo
    const techIds = data.technical_ids || {};

    // 2. Extracción de Identificadores para el SK
    // Priorizamos Tax ID para evitar colisiones entre vendors con nombres similares
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

    // 3. Construcción del Sort Key (SK) Blindada
    // Si no hay Tax ID válido (o es el placeholder "string"), usamos el nombre
    const idForSk = (rawTaxId && rawTaxId !== "string") ? rawTaxId : vendorName;
    
    const vendorPart = String(idForSk)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase() || "UNIDENTIFIED";
    
    const numberPart = String(invoiceNum)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();

    const SK = `INV#${vendorPart}#${numberPart}`;

    // 4. Lógica de Atribución Temporal y Consumo
    const invoiceDate = source.invoice_date || extracted.invoice_date || "0000-00-00";
    const pStart = source.billing_period?.start || extracted.period_start || meta.period_start;
    
    // Referencias de tiempo para dimensiones de analytics
    const yearRef = meta.year || (pStart ? pStart.split('-')[0] : invoiceDate.split('-')[0]) || 0;
    const monthRef = meta.month || (pStart ? pStart.split('-')[1] : invoiceDate.split('-')[1]) || 0;

    // Sumatoria de líneas de emisión (Consumo Físico)
    const allLines = data.emission_lines || [];
    const totalValue = allLines.reduce((acc, line) => acc + (Number(line.value) || 0), 0);
    const displayUnit = allLines[0]?.unit || "kWh";

    // 5. Lógica de Categoría y Revisión
    let serviceType = (meta.category || "OTHERS").toUpperCase();
    // Auto-corrección: Si es OTHERS pero la unidad es kWh, es Electricidad
    if (serviceType === "OTHERS" && displayUnit.toLowerCase() === 'kwh') {
        serviceType = "ELEC";
    }

    const confidence = meta.confidence_level === 'HIGH' ? 0.95 : (parseFloat(data.confidence_score) || 0.7);
    const needsReview = meta.anomaly_flag || totalValue === 0 || !pStart;

    // 6. Retorno del Objeto Estándar para DynamoDB
    return {
        PK: partitionKey,
        SK: SK,

        // Datos para lógica de negocio y Dashboard de emisiones
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

        // Dimensiones para filtros rápidos y agregaciones (GSI)
        analytics_dimensions: {
            period_month: parseInt(monthRef),
            period_year: parseInt(yearRef),
            sector: "COMMERCIAL",
            branch_id: meta.facility_id || "MAIN",
            asset_id: techIds.cups || techIds.meter_id || meta.service_id || "GENERIC_ASSET"
        },

        // Resultado directo del motor Climatiq
        climatiq_result: {
            co2e: Number(footprint?.total_kg || 0),
            co2e_unit: "kg",
            timestamp: now,
            audit_trail: footprint?.items || [] 
        },

        // Datos maestros extraídos para visualización en UI
        extracted_data: {
            vendor: vendorName,
            VENDOR_TAX_ID: rawTaxId,
            total_amount: Number(source.total_amount?.total_with_tax || 0),
            invoice_date: invoiceDate,
            billing_period: { 
                start: pStart, 
                end: source.billing_period?.end || extracted.period_end 
            },
            location: source.location || { country: meta.country_code || "ES" }
        },

        // Metadatos técnicos y auditoría
        metadata: {
            filename: s3Key.split('/').pop(),
            s3_key: s3Key,
            status: "PROCESSED",
            upload_date: now,
            // El hash técnico se guarda aquí para trazabilidad, pero NO afecta al SK
            technical_hash: crypto.createHash('sha256').update(s3Key).digest('hex').substring(0, 8),
            thought_process: data.audit_thought_process || meta.reasoning
        }
    };
};