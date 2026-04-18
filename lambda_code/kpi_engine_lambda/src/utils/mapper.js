export const buildGoldenRecord = (partitionKey, s3Key, ocrData, forcedStatus, defaultCategory) => {
    const isDraft = forcedStatus === "PENDING_REVIEW";
    const aiFields = ocrData.fields || {}; // Data limpia del Agente de IA

    // 1. Helpers de validación y limpieza
    const isInvalid = (val) => 
        !val || val === "PENDING" || val === "UNKNOWN" || val === "NOT_DETECTED" || val === "null";
    
    const parseNum = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : n;
    };

    const cleanForSk = (val) => String(val || "")
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();

    // 2. Lógica de Identificación para el SK
    // Usamos la categoría detectada por la IA para organizar la DB
    const categoryPart = cleanForSk(aiFields.service_category || defaultCategory || "OTHERS");
    
    const vendorId = !isInvalid(aiFields.vendor_tax_id) ? aiFields.vendor_tax_id : 
                     (!isInvalid(aiFields.vendor_name) ? aiFields.vendor_name : "UNKNOWN");
    const vendorPart = cleanForSk(vendorId);
    
    const numberPart = !isInvalid(aiFields.invoice_number) 
        ? cleanForSk(aiFields.invoice_number) 
        : `DRAFT${Date.now()}`;

    // SK Final Jerárquico: INV#GAS#CIFVENDEDOR#NUMERO
    const finalSK = `INV#${categoryPart}#${vendorPart}#${numberPart}`;

    // 3. Normalización de líneas y suma de magnitud (ESG)
    let totalMagnitude = 0;
    const sanitizedLines = (aiFields.lines || []).map(line => {
        const qty = parseNum(line.quantity);
        // Acumulamos kWh, Litros o m3 para métricas directas de sostenibilidad
        if (["KWH", "L", "M3"].includes(line.unit?.toUpperCase())) {
            totalMagnitude += qty;
        }
        return {
            description: line.description || "Sin descripción",
            quantity: qty,
            unit: line.unit || "u",
            unit_price: parseNum(line.unit_price),
            amount: parseNum(line.amount)
        };
    });

    return {
        PK: partitionKey,
        SK: finalSK,
        
        extracted_data: {
            // Emisor
            vendor_name: aiFields.vendor_name || "UNKNOWN",
            vendor_tax_id: aiFields.vendor_tax_id || "PENDING",
            
            // Receptor (Tu Empresa)
            customer_name: aiFields.customer_name || "UNKNOWN",
            customer_tax_id: aiFields.customer_tax_id || "PENDING",

            invoice_number: aiFields.invoice_number || "PENDING",
            invoice_date: aiFields.date || "0000-00-00",
            
            // Datos Técnicos específicos
            point_of_delivery: aiFields.cups || "N/A", // Para Electricidad/Gas
            plate_number: aiFields.plate_number || "N/A", // Para Camiones/Logística
            
            total_amount: parseNum(aiFields.total_amount),
            base_amount: parseNum(aiFields.base_amount),
            tax_amount: parseNum(aiFields.tax_amount),
            currency: aiFields.currency || "EUR",
            
            billing_period: {
                start: aiFields.period_start || "0000-00-00",
                end: aiFields.period_end || "0000-00-00"
            },
            lines: sanitizedLines
        },

        raw_capture: {
            full_text_preview: ocrData.rawText,
            lines: sanitizedLines
        },

        metadata: {
            s3_key: s3Key,
            status: forcedStatus,
            is_draft: isDraft,
            upload_date: new Date().toISOString(),
            processed_by: "Bedrock-Claude3-Haiku-MultiService"
        },

        ai_analysis: {
            service_type: aiFields.service_category || defaultCategory || "OTHERS",
            total_magnitude_sum: totalMagnitude, // Suma de kWh o Litros lista para el Dashboard
            requires_review: true,
            status_triage: "DRAFT_WAITING_VALIDATION"
        },

        total_days_prorated: 0 
    };
};