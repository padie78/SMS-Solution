import crypto from 'crypto';

export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const now = new Date().toISOString();
    
    // 1. Extraemos la data del nuevo esquema plano
    const extData = aiData.extracted_data || {};
    
    // Campos directos del nuevo prompt
    const invoiceDate = extData.invoice_date || "0000-00-00";
    const pStart = extData.period_start; 
    const pEnd = extData.period_end;
    const vendorName = extData.vendor || "UNKNOWN_VENDOR";
    const taxId = extData.VENDOR_TAX_ID || "NO_TAX_ID";

    // 2. Lógica de Atribución Temporal
    const referenceDate = pStart || invoiceDate; 
    const [yearRef, monthRef] = referenceDate.split('-');

    // 3. Generación de SK de Factura (Deduplicación)
    // Usamos el TaxID o el nombre para que la SK de la factura sea única
    const vendorClean = (taxId !== "NO_TAX_ID" ? taxId : vendorName)
        .replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const numberClean = (extData.invoice_number || "NONUM")
        .replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    const SK = `INV#${vendorClean}#${numberClean}`;

    // 4. Procesamiento de Líneas de Consumo
    const allLines = aiData.emission_lines || [];
    const consumptionLines = allLines.filter(line => {
        const u = (line.unit || '').toLowerCase();
        return ['kwh', 'm3', 'kg', 'l'].includes(u);
    });
    
    const totalValue = consumptionLines.reduce((acc, line) => acc + Number(line.value || 0), 0);
    const displayUnit = consumptionLines[0]?.unit || "kWh";

    // 5. Lógica de Revisión y Confianza
    const confidence = parseFloat(aiData.confidence_score) || 0;
    const hasDates = !!(pStart && pEnd);
    const needsReview = confidence < 0.8 || totalValue === 0 || !hasDates;

    return {
        PK: partitionKey,
        SK: SK,

        ai_analysis: {
            activity_id: footprint.activity_id || "genérica",
            calculation_method: "consumption_based",
            confidence_score: confidence,
            requires_review: needsReview,
            service_type: (aiData.category || "ELEC").toUpperCase(),
            unit: displayUnit,
            value: totalValue,
            year: parseInt(yearRef) || 0
        },

        analytics_dimensions: {
            period_month: parseInt(monthRef) || 0,
            period_year: parseInt(yearRef) || 0,
            sector: "COMMERCIAL",
            branch_id: "MAIN", // O extraer de metadata si lo tienes
            asset_id: "GENERIC_ASSET"
        },

        climatiq_result: {
            co2e: Number(footprint.total_kg || 0),
            co2e_unit: "kg",
            timestamp: now
        },

        // IMPORTANTE: Mantenemos la estructura que espera db.js
        extracted_data: {
            ...extData, // Pasamos todo lo que extrajo la IA (incluyendo VENDOR_TAX_ID)
            total_amount: Number(extData.total_amount || 0), // Aseguramos que sea número
            vendor: vendorName // Aseguramos que sea el string del nombre
        },

        metadata: {
            filename: s3Key.split('/').pop(),
            s3_key: s3Key,
            status: "PROCESSED",
            upload_date: now,
            technical_hash: crypto.createHash('sha256').update(s3Key).digest('hex').substring(0, 8)
        }
    };
};