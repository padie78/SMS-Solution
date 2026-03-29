const { generarBusquedaSemantica, extraerValorEspecifico } = require("./bedrock");

const CLIMATIQ_API_KEY = "2E44QNZJMX5X5B6EM43E88KRZ8"; 
const DATA_VERSION = "^32"; 
const BASE_URL = "https://api.climatiq.io/data/v1";

/**
 * Orquestación dinámica con Loop de Parámetros (Architecture v3)
 */
async function calculateInClimatiq(ocrSummary, queryHints = {}) {
    const startTime = Date.now();
    console.log("---------- [SEMANTIC CLIMATIQ FLOW START] ----------");

    try {
        // --- PASO 1: ANÁLISIS SEMÁNTICO (BEDROCK) ---
        const preAnalysis = await generarBusquedaSemantica(ocrSummary, queryHints);
        const region = preAnalysis.region || "ES";
        console.log(`[INFO] Intent: ${preAnalysis.service_type} | Region: ${region}`);

        // --- PASO 2: BÚSQUEDA POR CATEGORÍA ---
        let searchData = await callClimatiqSearch(preAnalysis.service_type, region);
        let usedGlobalFallback = false;

        if (!searchData.results?.length) {
            console.warn(`[WARN] No factors in ${region}. Trying Global...`);
            searchData = await callClimatiqSearch(preAnalysis.service_type, "WORLD");
            usedGlobalFallback = true;
        }

        if (!searchData.results?.length) throw new Error("No emission factors found.");

        const factor = searchData.results[0];
        console.log(`[INFO] Factor: ${factor.activity_id} (Needs: ${factor.unit_type})`);

        // --- PASO 3: EXTRACCIÓN MULTI-PARAM (BEDROCK) ---
        // Ahora esperamos que Bedrock devuelva un objeto con las keys necesarias
        const extractions = await extraerValorEspecifico(ocrSummary, factor.unit_type);

        // --- PASO 4: CONSTRUCCIÓN DINÁMICA CON LOOP ---
        const parameters = {};
        const keys = Object.keys(extractions); // Ej: ['energy', 'money']

        keys.forEach(key => {
            const data = extractions[key];
            if (data && data.value !== undefined) {
                parameters[key] = Number(data.value);
                parameters[`${key}_unit`] = data.unit.toLowerCase();
                
                // Inyectar moneda si existe en cualquier extracción de tipo money
                if (data.currency) parameters.currency = data.currency;
            }
        });

        const payload = {
            data_version: DATA_VERSION,
            emission_factor: {
                activity_id: factor.activity_id,
                region: region
            },
            parameters: parameters
        };

        console.log("🚀 [CLIMATIQ_ESTIMATE_PAYLOAD]:", JSON.stringify(payload, null, 2));

        // --- PASO 5: ESTIMACIÓN ---
        const res = await fetch(`${BASE_URL}/estimate`, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${CLIMATIQ_API_KEY}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Estimation Failed");

        const duration = Date.now() - startTime;
        console.log(`✅ [CLIMATIQ_SUCCESS]: ${data.co2e} ${data.co2e_unit} en ${duration}ms.`);

        return {
            co2e: data.co2e,
            unit: data.co2e_unit,
            activity_id: factor.activity_id,
            vendor: preAnalysis.vendor,
            audit: usedGlobalFallback ? "category_global_v3" : "category_region_v3"
        };

    } catch (err) {
        console.error("❌ [CLIMATIQ_PIPELINE_ERROR]:", err.message);
        return null; 
    }
}

/**
 * Helper: Búsqueda por Categoría
 */
async function callClimatiqSearch(serviceType, region) {
    const categoryMap = { 'elec': 'Electricity', 'gas': 'Fuel Combustion', 'fuel': 'Fuel Combustion', 'water': 'Water' };
    const category = categoryMap[serviceType] || 'Electricity';
    
    const url = `${BASE_URL}/search?category=${category}&region=${region}&limit=1`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${CLIMATIQ_API_KEY}` } });
    return await res.json();
}

module.exports = { calculateInClimatiq };