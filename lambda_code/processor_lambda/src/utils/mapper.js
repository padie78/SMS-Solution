export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const timestamp = new Date().toISOString();
    const invoiceDate = aiData.extracted_data?.invoice?.date || "0000-00-00";
    
    const [year, month] = invoiceDate.split('-');
    const currentYear = year || new Date().getFullYear().toString();
    const currentMonth = month || (new Date().getMonth() + 1).toString().padStart(2, '0');

    return {
        PK: partitionKey,
        SK: `INV#${invoiceDate}#${s3Key}`,
        
        // --- 1. DIMENSIONES PARA ANALÍTICA (Lo que pide db.js:23) ---
        analytics_dims: {
            year: currentYear,
            month: `M#${currentMonth}`,
            facility_id: "MAIN_PLANT", // O sacarlo de metadata si lo tienes
            category: aiData.category || "ELEC"
        },

        // --- 2. MÉTRICAS (Lo que pide la transacción en db.js) ---
        metrics: {
            co2e_tons: footprint.total_kg / 1000,
            consumption_value: aiData.extracted_data?.amounts?.total || 0,
            co2e_kg: footprint.total_kg
        },

        // --- 3. DATOS DE IDENTIDAD ---
        vendor_name: aiData.extracted_data?.vendor?.name || "Unknown",
        invoice_number: aiData.extracted_data?.invoice?.number || "N/A",
        currency: aiData.extracted_data?.amounts?.currency || "EUR",
        
        // --- 4. AUDIT TRAIL (resultsArray) ---
        emissions_breakdown: footprint.items,
        
        processed_at: timestamp,
        s3_reference: s3Key,
        status: "PROCESSED_SUCCESS"
    };
};