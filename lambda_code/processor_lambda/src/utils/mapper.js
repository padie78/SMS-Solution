import crypto from 'crypto';

export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const now = new Date().toISOString();
    
    // Referencia rápida al objeto invoice del prompt
    const invoice = aiData.extracted_data?.invoice;
    
    // Extraer datos para la Sort Key
    const invoiceDate = invoice?.date || "0000-00-00";
    const s3FileName = s3Key.split('/').pop();
    
    const fileHash = crypto.createHash('sha256').update(s3FileName).digest('hex');
    const shortHash = fileHash.substring(0, 8);
    const SK = `INV#${invoiceDate}#${shortHash}`;

    /**
     * CORRECCIÓN CRÍTICA: Ruta según tu Prompt
     * Tu prompt genera: "total_amount": { "total": "float", "currency": "ISO_4217" }
     */
    const rawTotal = invoice?.total_amount?.total || 0;
    const currency = invoice?.total_amount?.currency || "EUR";

    // Sanitización robusta de números
    const cleanAmount = typeof rawTotal === 'string' 
        ? parseFloat(rawTotal.replace(/[^0-9.,]/g, '').replace(',', '.')) 
        : Number(rawTotal);

    return {
        PK: partitionKey,
        SK: SK,

        ai_analysis: {
            activity_id: footprint.activity_id,
            calculation_method: "consumption_based",
            // Seguridad para evitar el error de toFixed(2)
            confidence_score: Number(aiData.confidence_score || 0), 
            insight_text: aiData.analysis_summary || `Processed invoice for ${aiData.extracted_data?.vendor?.name}`,
            parameter_type: "energy",
            region: aiData.extracted_data?.location?.country || "ES",
            requires_review: (Number(aiData.confidence_score || 0) < 0.8),
            service_type: aiData.category || "elec",
            // Ajustamos a la ruta de tus emission_lines si es necesario, 
            // o lo dejamos mapeado al primer valor encontrado
            unit: aiData.emission_lines?.[0]?.unit || "kWh",
            value: Number(aiData.emission_lines?.[0]?.value || 0),
            year: invoiceDate.split('-')[0]
        },

        analytics_dimensions: {
            carbon_intensity: footprint.carbon_intensity || 0,
            period_month: parseInt(invoiceDate.split('-')[1]) || 0,
            period_year: parseInt(invoiceDate.split('-')[0]) || 0,
            sector: "COMMERCIAL" 
        },

        climatiq_result: {
            activity_id: footprint.activity_id,
            audit_trail: "climatiq_elec_consumption_based",
            co2e: Number(footprint.total_kg || 0),
            co2e_unit: "kg",
            timestamp: now
        },

        extracted_data: {
            billing_period: {
                // Si la IA no los extrajo, estos vendrán como null
                start: invoice?.period_start || null,
                end: invoice?.period_end || null
            },
            currency: currency,
            invoice_date: invoiceDate,
            invoice_number: invoice?.number || "NO-NUMBER",
            // ASIGNACIÓN FINAL CORREGIDA
            total_amount: cleanAmount || 0, 
            vendor: aiData.extracted_data?.vendor?.name || "Unknown Vendor"
        },

        metadata: {
            filename: s3FileName,
            file_hash: fileHash,
            s3_key: s3Key,
            source: "SYSTEM_PIPELINE",
            status: "PROCESSED",
            upload_date: now
        }
    };
};