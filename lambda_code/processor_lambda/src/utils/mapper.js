import crypto from 'crypto';

export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const now = new Date().toISOString();
    
    const extData = aiData.extracted_data || {};
    const invoice = extData.invoice || {};
    const totalObj = extData.total_amount || {};
    const vendor = extData.vendor || {};
    
    // 1. Fechas clave
    const invoiceDate = invoice.date || "0000-00-00";
    const pStart = invoice.period_start; // "YYYY-MM-DD"
    const pEnd = invoice.period_end;

    // --- LÓGICA DE ATRIBUCIÓN TEMPORAL (LA CORRECCIÓN) ---
    // Si tenemos fecha de inicio de periodo, usamos esa para las estadísticas.
    // Si no, caemos en la fecha de la factura como fallback.
    const referenceDate = pStart || invoiceDate; 
    const [yearRef, monthRef] = referenceDate.split('-');

    // ... (Mantienes igual la lógica de SK, consumptionLines y totalValue) ...
    const vendorClean = (vendor.name || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const numberClean = (invoice.number || "NONUM").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const SK = `INV#${vendorClean}#${numberClean}`;

    const allLines = aiData.emission_lines || [];
    const consumptionLines = allLines.filter(line => {
        const u = (line.unit || '').toLowerCase();
        return u === 'kwh' || u === 'm3' || u === 'kg' || u === 'l';
    });
    const totalValue = consumptionLines.reduce((acc, line) => acc + Number(line.value || 0), 0);
    const displayUnit = consumptionLines[0]?.unit || "kWh";

    // --- LÓGICA DE REVISIÓN ---
    const confidence = parseFloat(aiData.confidence_score) || 0;
    const hasDates = !!(pStart && pEnd);
    const needsReview = confidence < 0.8 || totalValue === 0 || !hasDates;

    // ... (Mantienes igual climatiq_result y metadata) ...

    return {
        PK: partitionKey,
        SK: SK,

        ai_analysis: {
            // ... (Campos anteriores) ...
            activity_id: footprint.activity_id || "electricity-supply_grid_es",
            calculation_method: "consumption_based",
            confidence_score: confidence,
            requires_review: needsReview,
            service_type: (aiData.category || "ELEC").toUpperCase(),
            unit: displayUnit,
            value: totalValue,
            year: yearRef // 👈 Ahora basado en el consumo
        },

        // LA CLAVE: analytics_dimensions ahora usa monthRef y yearRef
        analytics_dimensions: {
            period_month: parseInt(monthRef) || 0, // 👈 Si pStart es 2026-03-01, esto es 3
            period_year: parseInt(yearRef) || 0,   // 👈 2026
            sector: "COMMERCIAL"
        },

        climatiq_result: {
            co2e: Number(footprint.total_kg || 0),
            co2: Number(footprint.constituent_gases?.co2 || footprint.total_kg || 0),
            ch4: Number(footprint.constituent_gases?.ch4 || 0),
            n2o: Number(footprint.constituent_gases?.n2o || 0),
            co2e_unit: "kg",
            timestamp: now
        },

        extracted_data: {
            billing_period: {
                start: pStart || null,
                end: pEnd || null
            },
            currency: totalObj.currency || "EUR",
            invoice_date: invoiceDate,
            invoice_number: invoice.number || "NO-NUMBER",
            total_amount: Number(totalObj.total || 0),
            vendor: vendor.name || "Unknown Vendor"
        },

        metadata: {
            // ... (Igual que antes) ...
            filename: s3Key.split('/').pop(),
            s3_key: s3Key,
            status: "PROCESSED",
            upload_date: now,
            technical_hash: crypto.createHash('sha256').update(s3Key).digest('hex').substring(0, 8)
        }
    };
};