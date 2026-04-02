export const buildGoldenRecord = (partitionKey, s3Key, aiData, footprint) => {
    const timestamp = new Date().toISOString();
    const invoiceDate = aiData.extracted_data?.invoice?.date; // Formato YYYY-MM-DD
    
    // Extraemos el año para que db.js no explote
    const year = invoiceDate ? invoiceDate.split('-')[0] : new Date().getFullYear().toString();

    return {
        PK: partitionKey,
        SK: `INV#${invoiceDate || '0000-00-00'}#${s3Key}`,
        year: year, // <--- ESTO ES LO QUE BUSCA TU db.js:23:45
        
        vendor_name: aiData.extracted_data?.vendor?.name || "Unknown",
        invoice_number: aiData.extracted_data?.invoice?.number || "N/A",
        total_amount: aiData.extracted_data?.amounts?.total || 0,
        currency: aiData.extracted_data?.amounts?.currency || "EUR",
        
        total_co2e_kg: footprint.total_kg,
        category: aiData.category,
        emissions_breakdown: footprint.items,
        
        processed_at: timestamp,
        s3_reference: s3Key,
        status: "PROCESSED_SUCCESS"
    };
};