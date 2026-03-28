/**
 * Multi-model Climatiq API Wrapper
 * Fully synced with Bedrock's ai_analysis output.
 */
async function calculateInClimatiq(ai_analysis) {
    const apiKey = "2E44QNZJMX5X5B6EM43E88KRZ8";
    const baseUrl = "https://api.climatiq.io/data/v1";

    // 1. Unit Normalization (Mapping raw OCR units to Climatiq standards)
    const unitMap = { 
        "kilowatt-hour": "kWh", "kwh": "kWh", 
        "liters": "l", "litros": "l", 
        "m3": "m3", "tons": "t", "toneladas": "t" 
    };
    const normalizedUnit = unitMap[ai_analysis.unit?.toLowerCase()] || ai_analysis.unit;
    
    // We use service_type to decide the endpoint (Freight and Travel are special)
    const serviceType = ai_analysis.service_type?.toLowerCase() || "unknown";
    let url = `${baseUrl}/estimate`;
    let body = {};

    // 2. Strategy Pattern: Route request based on service type
    switch (serviceType) {
        
        case "freight": 
            url = `${baseUrl}/freight/v3/intermodal`;
            body = {
                route: ai_analysis.route || [], // Requires route data from Bedrock
                cargo: {
                    weight: Number(ai_analysis.value),
                    weight_unit: normalizedUnit || "t"
                }
            };
            break;

        case "travel":
            url = `${baseUrl}/travel/flights`;
            body = {
                legs: ai_analysis.legs || [], // Requires flight legs from Bedrock
                passengers: ai_analysis.passengers || 1
            };
            break;

        // Default: Electricity, Gas, Water, Fuel, etc.
        default: 
            const parameters = {};
            const numericValue = Number(ai_analysis.value) || 0;

            if (ai_analysis.calculation_method === "spend_based") {
                // Mapping for monetary calculations
                parameters.money = numericValue;
                parameters.money_unit = ai_analysis.unit?.toLowerCase() || "usd";
            } else {
                // Mapping for consumption calculations (energy, volume, weight, etc.)
                const paramKey = ai_analysis.parameter_type || "energy"; 
                parameters[paramKey] = numericValue;
                parameters[`${paramKey}_unit`] = normalizedUnit;
            }

            body = {
                emission_factor: {
                    activity_id: ai_analysis.activity_id,
                    data_version: "^21",
                    region: ai_analysis.region || "IL" // Using Israel as default for your current location
                },
                parameters
            };
            break;
    }

    // 3. Request Execution with Timeout Control
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
        console.log(`[CLIMATIQ_ROUTING] Service: ${serviceType} | ID: ${ai_analysis.activity_id}`);

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
            console.error(`[CLIMATIQ_API_REJECTED]: ${JSON.stringify(data)}`);
            throw new Error(`Climatiq_${response.status}: ${data.message || data.error_code}`);
        }

        // 4. Unified Response for DynamoDB
        return {
            calculation_id: data.calculation_id || data.emission_factor?.id || "N/A",
            co2e: Number(data.co2e),
            co2e_unit: data.co2e_unit || "kg",
            activity_id: data.emission_factor?.activity_id || ai_analysis.activity_id,
            audit_trail: data.audit_trail || `climatiq_${serviceType}`,
            timestamp: new Date().toISOString(),
            metadata: {
                region: data.emission_factor?.region || ai_analysis.region,
                year: data.emission_factor?.year || 2026
            }
        };

    } catch (error) {
        if (timeout) clearTimeout(timeout);
        console.error(`[CLIMATIQ_EXCEPTION] [${serviceType}]:`, error.message);
        
        return { 
            co2e: 0, 
            co2e_unit: "kg", 
            error: true, 
            message: error.message,
            calculation_id: "ERROR_API_FALLBACK" 
        };
    }
}

module.exports = { calculateInClimatiq };