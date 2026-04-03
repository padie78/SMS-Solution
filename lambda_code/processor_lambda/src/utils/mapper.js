import crypto from 'crypto';

/**
 * Mapea la respuesta de Bedrock y Climatiq a un Golden Record.
 * Versión Híbrida: Totalización para Dashboards + Detalle para Auditoría.
 */
export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const now = new Date().toISOString();
    
    // 1. Extracción y Normalización de datos básicos
    const extData = aiData.extracted_data || {};
    const invoice = extData.invoice || {};
    const totalObj = extData.total_amount || {};
    const vendor = extData.vendor || {};
    const invoiceDate = invoice.date || "0000-00-00";

    // 2. SK Natural para evitar duplicados (Vendor + Número de Factura)
    const vendorClean = (vendor.name || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const numberClean = (invoice.number || "NONUM").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const SK = `INV#${vendorClean}#${numberClean}`;

    // 3. Cálculo del Valor Agregado (Suma para el Dashboard)
    const lines = aiData.emission_lines || [];
    const totalValue = lines.reduce((acc, line) => acc + Number(line.value || 0), 0);
    const displayUnit = lines[0]?.unit || "kWh";

    // 4. Lógica de Gases y Huella (con Fallback de seguridad)
    const gases = footprint.constituent_gases || {};
    const totalCo2e = Number(footprint.total_kg || footprint.co2e || 0);
    const co2SafeValue = (gases.co2 && gases.co2 > 0) ? gases.co2 : totalCo2e;

    // 5. Sanitización de montos y confianza
    const confidence = Number(aiData.confidence_score || 0);
    const cleanAmount = typeof totalObj.total === 'string' 
        ? parseFloat(totalObj.total.replace(/[^0-9.,]/g, '').replace(',', '.')) 
        : Number(totalObj.total || 0);

    // 6. Construcción del Objeto Final
    return {
        PK: partitionKey,
        SK: SK,

        // Resumen para analítica rápida
        ai_analysis: {
            activity_id: footprint.activity_id || "electricity-supply_grid_es",
            calculation_method: "consumption_based",
            confidence_score: confidence,
            insight_text: aiData.analysis_summary || `Factura de ${vendor.name} procesada.`,
            requires_review: (confidence < 0.8),
            service_type: (aiData.category || "ELEC").toUpperCase(),
            unit: displayUnit,
            value: totalValue, // El total de 220
            year: invoiceDate.split('-')[0]
        },

        // --- NUEVO: DESGLOSE LÍNEA POR LÍNEA ---
        // Esto permite que el usuario vea el detalle original en el frontend
        line_items: lines.map((line, index) => ({
            id: index + 1,
            description: line.description || "Consumo eléctrico",
            value: Number(line.value || 0),
            unit: line.unit || "kWh"
        })),

        analytics_dimensions: {
            period_month: parseInt(invoiceDate.split('-')[1]) || 0,
            period_year: parseInt(invoiceDate.split('-')[0]) || 0,
            sector: "COMMERCIAL"
        },

        climatiq_result: {
            co2e: totalCo2e,
            co2: Number(co2SafeValue),
            ch4: Number(gases.ch4 || 0),
            n2o: Number(gases.n2o || 0),
            co2e_unit: "kg",
            timestamp: now
        },

        extracted_data: {
            billing_period: {
                start: invoice.period_start || null,
                end: invoice.period_end || null
            },
            currency: totalObj.currency || "EUR",
            invoice_date: invoiceDate,
            invoice_number: invoice.number || "NO-NUMBER",
            total_amount: isNaN(cleanAmount) ? 0 : cleanAmount,
            vendor: vendor.name || "Unknown Vendor"
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

export default { buildGoldenRecord };