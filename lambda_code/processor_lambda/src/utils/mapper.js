import crypto from 'crypto';

/**
 * Mapeador de "Golden Record"
 * Convierte la salida de Bedrock y Climatiq en un formato estandarizado para DynamoDB.
 */
export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const now = new Date().toISOString();
    
    // 1. Normalización de la entrada (Soporte para esquema Senior y Legacy)
    const source = aiData.source_data || {};
    const meta = aiData.analytics_metadata || {};
    const extracted = aiData.extracted_data || {};
    
    // 2. Extracción de Identificadores Clave (Deduplicación)
    // Buscamos el Tax ID en todos los lugares posibles
    const rawTaxId = source.vendor?.tax_id || 
                     aiData.technical_ids?.tax_id || 
                     extracted.VENDOR_TAX_ID || 
                     extracted.tax_id || 
                     "NO_TAX_ID";

    // Buscamos el Nombre del Vendor
    const vendorName = (typeof source.vendor === 'object' ? source.vendor.name : null) || 
                       extracted.vendor || 
                       "UNKNOWN_VENDOR";

    // Buscamos el Número de Factura
    const invoiceNum = source.invoice_number || 
                       extracted.invoice_number || 
                       `NONUM-${Date.now()}`;

    // 3. Construcción del Sort Key (SK) Limpio
    // Prioridad: TaxID -> VendorName (si no hay TaxID)
    const vendorPart = (rawTaxId !== "NO_TAX_ID" ? rawTaxId : vendorName)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
    
    const numberPart = String(invoiceNum)
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();

    const SK = `INV#${vendorPart}#${numberPart}`;

    // 4. Lógica de Atribución Temporal
    const invoiceDate = source.invoice_date || extracted.invoice_date || "0000-00-00";
    const pStart = source.billing_period?.start || extracted.period_start;
    const pEnd = source.billing_period?.end || extracted.period_end;

    // Priorizamos los datos calculados por la IA en analytics_metadata
    const yearRef = meta.year || (pStart ? pStart.split('-')[0] : invoiceDate.split('-')[0]) || 0;
    const monthRef = meta.month || (pStart ? pStart.split('-')[1] : invoiceDate.split('-')[1]) || 0;

    // 5. Procesamiento de Consumo Físico
    const allLines = aiData.emission_lines || [];
    // Sumamos todos los valores de las líneas (P1, P2, P3, etc.)
    const totalValue = allLines.reduce((acc, line) => acc + (Number(line.value) || 0), 0);
    const displayUnit = allLines[0]?.unit || "kWh";

    // 6. Lógica de Revisión y Confianza
    const confidence = meta.confidence_level === 'HIGH' ? 0.95 : (parseFloat(aiData.confidence_score) || 0.7);
    const needsReview = meta.anomaly_flag || totalValue === 0 || !pStart;

    // 7. Retorno del Objeto Final (Estructura DynamoDB)
    return {
        PK: partitionKey,
        SK: SK,

        // Datos para lógica de negocio y cálculos
        ai_analysis: {
            activity_id: footprint.activity_id || "genérica",
            calculation_method: "consumption_based",
            confidence_score: confidence,
            requires_review: needsReview,
            service_type: (meta.category || extracted.service_type || "ELEC").toUpperCase(),
            unit: displayUnit,
            value: totalValue,
            year: parseInt(yearRef)
        },

        // Datos para agregaciones y filtros en Dashboard
        analytics_dimensions: {
            period_month: parseInt(monthRef),
            period_year: parseInt(yearRef),
            sector: "COMMERCIAL",
            branch_id: meta.facility_id || "MAIN",
            asset_id: meta.service_id || "GENERIC_ASSET"
        },

        // Resultados del motor de emisiones (Climatiq)
        climatiq_result: {
            co2e: Number(footprint.total_kg || 0),
            co2e_unit: "kg",
            timestamp: now,
            audit_trail: footprint.items || [] 
        },

        // Datos extraídos para visualización en UI
        extracted_data: {
            vendor: vendorName,
            VENDOR_TAX_ID: rawTaxId,
            total_amount: Number(source.total_amount?.total_with_tax || extracted.total_amount || 0),
            invoice_date: invoiceDate,
            billing_period: { start: pStart, end: pEnd },
            location: source.location || { country: meta.country_code || "ES" }
        },

        // Metadatos técnicos
        metadata: {
            filename: s3Key.split('/').pop(),
            s3_key: s3Key,
            status: "PROCESSED",
            upload_date: now,
            technical_hash: crypto.createHash('sha256').update(s3Key).digest('hex').substring(0, 8),
            // Guardamos el razonamiento de la IA para auditoría
            thought_process: aiData.audit_thought_process || meta.reasoning
        }
    };
};