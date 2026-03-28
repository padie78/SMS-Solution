/**
 * Climatiq Wrapper - SMS Project
 * Asegúrate de que este archivo termine con module.exports
 */
async function calculateInClimatiq(ai_analysis) {
    // 1. LOG DE ENTRADA ABSOLUTA
    console.log("---------- [DEBUG SMS START] ----------");
    console.log("Recibido ai_analysis:", JSON.stringify(ai_analysis, null, 2));

    const apiKey = "2E44QNZJMX5X5B6EM43E88KRZ8"; 
    const baseUrl = "https://api.climatiq.io/data/v1/estimate";
    const DATA_VERSION = "32.32"; 

    try {
        // Validación básica para evitar crashes por undefined
        if (!ai_analysis) throw new Error("ai_analysis es undefined o null");

        const serviceType = ai_analysis.service_type?.toLowerCase() || 'unknown';
        const calculationMethod = ai_analysis.calculation_method || 'unknown';

        // --- LÓGICA DE NORMALIZACIÓN ---
        function sanitizeUnits(sType, rawUnit, method) {
            if (!rawUnit) return method === 'spend_based' ? 'eur' : 'kWh';
            const unit = rawUnit.toLowerCase().trim();
            if (method === 'spend_based') {
                const currencyMap = { "euro": "eur", "euros": "eur", "eur": "eur", "dollar": "usd", "shekel": "ils" };
                return currencyMap[unit] || "eur";
            }
            if (sType?.includes('elec') || sType?.includes('gas')) return 'kWh';
            return "kWh"; 
        }

        function getAdjustedActivityId(method, sType) {
            if (method === 'spend_based') {
                if (sType.includes('elec')) return "energy-distribution"; 
                if (sType.includes('gas')) return "gas-distribution";
                return "industrial_processing-services"; 
            }
            return "electricity-supply_grid-source_production_mix";
        }

        const paramType = calculationMethod === 'spend_based' ? 'money' : 'energy';
        const unit = sanitizeUnits(serviceType, ai_analysis.unit, calculationMethod);
        const activityId = getAdjustedActivityId(calculationMethod, serviceType);

        // 2. CONSTRUCCIÓN DEL PAYLOAD
        const finalPayload = {
            data_version: DATA_VERSION,
            emission_factor: {
                activity_id: activityId,
                region: ai_analysis.region || "ES",
                year: ai_analysis.year || 2023,
                data_version: DATA_VERSION 
            },
            parameters: {
                [paramType]: Number(ai_analysis.value),
                [`${paramType}_unit`]: unit
            }
        };

        // --- LOG CRÍTICO ANTES DE FETCH ---
        console.log("🚀 [CLIMATIQ_PAYLOAD_PRE_FLIGHT]:", JSON.stringify(finalPayload, null, 2));

        const response = await fetch(baseUrl, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${apiKey}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify(finalPayload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ [CLIMATIQ_API_REJECTED]:", JSON.stringify(data, null, 2));
            throw new Error(data.message || data.error_code);
        }

        console.log("✅ [CLIMATIQ_SUCCESS]: CO2 =", data.co2e);
        console.log("---------- [DEBUG SMS END] ----------");

        return {
            calculation_id: data.calculation_id,
            co2e: Number(data.co2e),
            co2e_unit: data.co2e_unit,
            activity_id: activityId,
            audit_trail: "direct_match",
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error("🔥 [FATAL_EXCEPTION_IN_WRAPPER]:", error.message);
        throw error; 
    }
}

// ESTA LÍNEA ES LA QUE SOLUCIONA EL "NOT A FUNCTION"
module.exports = { calculateInClimatiq };