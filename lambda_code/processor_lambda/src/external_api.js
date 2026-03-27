/**
 * Invocación a Climatiq API v1/estimate
 * Adaptada para corregir Error 400 (Query not found) y versionado de datos.
 */
async function calcularEnClimatiq(ai_analysis) {
    const url = "https://api.climatiq.io/data/v1/estimate";
    
    // Key directa para testeo (recuerda pasarla a process.env después)
    const apiKey = "2E44QNZJMX5X5B6EM43E88KRZ8";

    if (!apiKey) {
        console.error("[CLIMATIQ_CONFIG_ERROR]: API Key no encontrada.");
        return { co2e: 0, error: true, message: "Missing API Key" };
    }

    // 1. Normalización de Unidades
    const unitMap = { 
        "kilowatt-hour": "kWh", 
        "kilovatios": "kWh", 
        "kwh": "kWh", 
        "m3": "m3", 
        "litros": "l",
        "usd": "usd",
        "eur": "eur"
    };
    const normalizedUnit = unitMap[ai_analysis.unit?.toLowerCase()] || ai_analysis.unit;

    // 2. Construcción de Parámetros y Validación de Activity ID
    const parameters = {};
    const valorNumerico = Number(ai_analysis.value) || 0;

    // Fallback de seguridad: Si Bedrock no provee un ID válido, usamos el genérico de red eléctrica
    const safeActivityId = (ai_analysis.activity_id && ai_analysis.activity_id.length > 5)
        ? ai_analysis.activity_id
        : "electricity-supply_grid-source_production_mix";

    if (ai_analysis.calculation_method === "spend_based") {
        parameters.money = valorNumerico;
        parameters.money_unit = ai_analysis.unit?.toLowerCase() || "usd"; 
    } else {
        const type = ai_analysis.parameter_type || "energy"; 
        parameters[type] = valorNumerico;
        parameters[`${type}_unit`] = normalizedUnit;
    }

    const body = {
        emission_factor: {
            activity_id: safeActivityId,
            // FIX: Usamos ^1 para mayor compatibilidad con los factores de emisión existentes
            data_version: "^1" 
        },
        parameters
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        console.log(`[CLIMATIQ_DEBUG] Intentando cálculo con ActivityID: ${safeActivityId}`);

        const response = await fetch(url, {
            method: "POST",
            signal: controller.signal,
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        clearTimeout(timeout);
        const data = await response.json();

        if (!response.ok) {
            // Si falla el factor específico, logueamos el ID para ajustarlo en el prompt de Bedrock
            console.error(`[CLIMATIQ_QUERY_FAIL]: ID rechazado -> ${safeActivityId}`);
            throw new Error(`Climatiq_${response.status}: ${data.message || data.error_code}`);
        }

        return {
            calculation_id: data.calculation_id,
            co2e: Number(data.co2e),
            co2e_unit: data.co2e_unit || "kg",
            activity_id: data.emission_factor?.activity_id,
            audit_trail: "climatiq_api_v1_estimate",
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        clearTimeout(timeout);
        console.error("[CLIMATIQ_EXCEPTION]:", error.message);
        
        return { 
            co2e: 0, 
            co2e_unit: "kg", 
            error: true, 
            message: error.message,
            calculation_id: "ERROR_API_FALLBACK" 
        };
    }
}

module.exports = { calcularEnClimatiq };