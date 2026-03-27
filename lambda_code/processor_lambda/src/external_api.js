/**
 * Invocación Multimodelo a Climatiq API
 * Soporta: Basic Estimate, Freight (v3) y Travel (v1).
 */
async function calcularEnClimatiq(ai_analysis) {
    const apiKey = "2E44QNZJMX5X5B6EM43E88KRZ8";
    const baseUrl = "https://api.climatiq.io/data/v1";

    // 1. Mapeo de Unidades y Endpoints
    const unitMap = { "kilowatt-hour": "kWh", "kwh": "kWh", "litros": "l", "m3": "m3", "toneladas": "t" };
    const normalizedUnit = unitMap[ai_analysis.unit?.toLowerCase()] || ai_analysis.unit;
    
    // Determinamos qué "Sabor" de la API usar
    const facturaTipo = ai_analysis.factura_tipo || "general"; // 'general', 'freight', 'travel'
    let url = `${baseUrl}/estimate`;
    let body = {};

    // 2. Construcción de Payload según el Modelo (Los "Tipos")
    switch (facturaTipo) {
        
        case "freight": // Para logística y transporte de carga
            url = `${baseUrl}/freight/v3/intermodal`;
            body = {
                route: ai_analysis.route || [], // Array de {from, to, mode}
                cargo: {
                    weight: Number(ai_analysis.value),
                    weight_unit: normalizedUnit || "t"
                }
            };
            break;

        case "travel": // Para viajes corporativos (vuelos, trenes)
            url = `${baseUrl}/travel/flights`;
            body = {
                legs: ai_analysis.legs || [], // Array de {from, to, class}
                passengers: ai_analysis.passengers || 1
            };
            break;

        case "general":
        default: // El "Basic Estimate" que ya conocemos para Energía/Agua/Gas
            const parameters = {};
            const valorNumerico = Number(ai_analysis.value) || 0;

            if (ai_analysis.calculation_method === "spend_based") {
                parameters.money = valorNumerico;
                parameters.money_unit = ai_analysis.unit?.toLowerCase() || "usd";
            } else {
                const type = ai_analysis.parameter_type || "energy"; 
                parameters[type] = valorNumerico;
                parameters[`${type}_unit`] = normalizedUnit;
            }

            body = {
                emission_factor: {
                    activity_id: ai_analysis.activity_id || "electricity-supply_grid-source_residual_mix",
                    data_version: "^21",
                    region: ai_analysis.region || "IL" // Default para evitar el 400
                },
                parameters
            };
            break;
    }

    // 3. Ejecución del Request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
        console.log(`[CLIMATIQ_ROUTING] Tipo: ${facturaTipo} | URL: ${url}`);

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

        // 4. Normalización de Salida (Para que DynamoDB reciba siempre lo mismo)
        return {
            calculation_id: data.calculation_id || data.emission_factor?.id || "N/A",
            co2e: Number(data.co2e),
            co2e_unit: data.co2e_unit || "kg",
            activity_id: data.emission_factor?.activity_id || facturaTipo,
            audit_trail: data.audit_trail || `climatiq_${facturaTipo}`,
            timestamp: new Date().toISOString(),
            metadata: {
                region: data.emission_factor?.region || ai_analysis.region,
                year: data.emission_factor?.year || 2026
            }
        };

    } catch (error) {
        if (timeout) clearTimeout(timeout);
        console.error(`[CLIMATIQ_EXCEPTION] [${facturaTipo}]:`, error.message);
        
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