import crypto from 'crypto';

/**
 * Mapea la respuesta de la IA a un Golden Record para DynamoDB.
 * Implementa una estrategia de Deduplicación por Llave Natural (Vendor + Invoice Number).
 */
export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const now = new Date().toISOString();
    
    // 1. Extraer y normalizar datos de entrada (Rutas validadas por logs)
    const extData = aiData.extracted_data || {};
    const invoice = extData.invoice || {};
    const totalObj = extData.total_amount || {};
    const vendor = extData.vendor || {};

    // 2. Lógica de Deduplicación: Generación de la SK Natural
    // Normalizamos eliminando espacios, símbolos y pasando a Mayúsculas
    const vendorClean = (vendor.name || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const numberClean = (invoice.number || "NONUM").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const invoiceDate = invoice.date || "0000-00-00";

    /**
     * ESTRATEGIA DE LLAVE ÚNICA (SK):
     * Al usar los datos reales de la factura, el ConditionExpression: "attribute_not_exists(SK)"
     * de tu base de datos detendrá cualquier intento de duplicar el gasto en los STATS.
     * Ejemplo: INV#ELEIA#9041N13179782023
     */
    const SK = `INV#${vendorClean}#${numberClean}`;

    // 3. Sanitización de Datos Numéricos
    const rawTotal = totalObj.total || 0;
    const cleanAmount = typeof rawTotal === 'string' 
        ? parseFloat(rawTotal.replace(/[^0-9.,]/g, '').replace(',', '.')) 
        : Number(rawTotal);

    const confidence = Number(aiData.confidence_score || 0);

    // 4. Construcción del Objeto Final (Esquema de Tabla Única)
    return {
        PK: partitionKey,
        SK: SK,

        // Bloque IA: Metadatos para auditoría y validación de confianza
        ai_analysis: {
            activity_id: footprint.activity_id,
            calculation_method: "consumption_based",
            confidence_score: confidence,
            insight_text: aiData.analysis_summary || `Processed invoice from ${vendor.name}`,
            requires_review: (confidence < 0.8),
            service_type: (aiData.category || "ELEC").toUpperCase(),
            unit: aiData.emission_lines?.[0]?.unit || "kWh",
            value: Number(aiData.emission_lines?.[0]?.value || 0),
            year: invoiceDate.split('-')[0]
        },

        // Bloque Analítico: Facilita filtros en el Dashboard y STATS
        analytics_dimensions: {
            period_month: parseInt(invoiceDate.split('-')[1]) || 0,
            period_year: parseInt(invoiceDate.split('-')[0]) || 0,
            sector: "COMMERCIAL"
        },

        // Bloque Climatiq: Huella de Carbono calculada
        climatiq_result: {
            co2e: Number(footprint.total_kg || 0),
            co2e_unit: "kg",
            timestamp: now
        },

        // Bloque Extracted Data: Lo que se visualiza en la tabla de transacciones
        extracted_data: {
            billing_period: {
                start: invoice.period_start || null,
                end: invoice.period_end || null
            },
            currency: totalObj.currency || "EUR",
            invoice_date: invoiceDate,
            invoice_number: invoice.number || "NO-NUMBER",
            total_amount: isNaN(cleanAmount) ? 0 : cleanAmount, // Garantizado como Número
            vendor: vendor.name || "Unknown Vendor"
        },

        // Bloque de Metadatos: Trazabilidad del archivo original
        metadata: {
            filename: s3Key.split('/').pop(),
            s3_key: s3Key,
            status: "PROCESSED",
            upload_date: now,
            // Guardamos un hash técnico opcional para trazabilidad de archivos
            technical_hash: crypto.createHash('sha256').update(s3Key).digest('hex').substring(0, 8)
        }
    };
};

export default { buildGoldenRecord };