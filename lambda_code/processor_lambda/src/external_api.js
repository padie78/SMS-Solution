const { STRATEGIES } = require("./constants/climatiq_catalog");
const { entenderFacturaParaClimatiq } = require("./bedrock");

const CLIMATIQ_API_KEY = "2E44QNZJMX5X5B6EM43E88KRZ8"; 
const BASE_URL = "https://api.climatiq.io/data/v1";

/**
 * Normaliza los parámetros y asegura que las unidades sean 
 * aceptadas por el motor de Climatiq (case-sensitive).
 */
function buildClimatiqParameters(strategy, line) {
    if (!line || !strategy) return null;
    
    const val = Number(line.value) || 0;
    const unitMapping = { 
        "kwh": "kWh", 
        "kWh": "kWh", 
        "kg": "kg", 
        "t": "t", 
        "km": "km",
        "t.km": "t.km"
    };

    const rawUnit = (line.unit || strategy.default_unit || "").toLowerCase();
    const cleanUnit = unitMapping[rawUnit] || rawUnit;

    switch (strategy.unit_type.toLowerCase()) {
        case "energy": 
            return { energy: val, energy_unit: cleanUnit };
        case "weight": 
            return { weight: val, weight_unit: cleanUnit };
        case "distance": 
            return { distance: val, distance_unit: cleanUnit };
        case "weightoverdistance": 
            return { 
                weight: Number(line.logistics_meta?.weight) || 0, 
                weight_unit: "t",
                distance: Number(line.logistics_meta?.distance) || 0,
                distance_unit: "km"
            };
        default: 
            return null;
    }
}

async function calculateInClimatiq(ocrSummary, queryHints = {}) {
    // Objeto de respuesta garantizado para evitar 'undefined' en el llamador
    const defaultResponse = {
        total_co2e: 0,
        items: [],
        invoice_metadata: {
            vendor: "Unknown",
            invoice_no: "N/A",
            invoice_date: new Date().toISOString().split('T')[0],
            total_amount_net: 0,
            currency: "EUR"
        }
    };

    try {
        if (!ocrSummary) return defaultResponse;

        const fullAnalysis = await entenderFacturaParaClimatiq(ocrSummary, queryHints);
        
        if (!fullAnalysis || !Array.isArray(fullAnalysis.emission_lines)) {
            console.warn("⚠️ [BEDROCK_EMPTY]: No se detectaron líneas de emisión.");
            return defaultResponse;
        }

        const lines = fullAnalysis.emission_lines;
        const meta = fullAnalysis.extracted_data || {};

        const linePromises = lines.map(async (line) => {
            const strategy = STRATEGIES[line.strategy];
            
            // BLINDAJE 1: Estrategia no encontrada
            if (!strategy) {
                console.error(`❌ [STRATEGY_MISSING]: ${line.strategy}`);
                return { success: false, error: "Strategy Not Found", co2e: 0, strategy: line.strategy };
            }

            const params = buildClimatiqParameters(strategy, line);
            
            // BLINDAJE 2: Parámetros inválidos
            if (!params) {
                console.error(`❌ [PARAMS_INVALID]: ${line.strategy}`);
                return { success: false, error: "Invalid Params", co2e: 0, strategy: line.strategy };
            }

            try {
                const res = await fetch(`${BASE_URL}/estimate`, {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${CLIMATIQ_API_KEY}`, 
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        emission_factor: {
                            activity_id: strategy.activity_id,
                            data_version: "^1",
                            region: "GB", 
                            year: 2021
                        },
                        parameters: params
                    })
                });

                const data = await res.json();

                // BLINDAJE 3: Error de la API (400, 401, 404, etc)
                if (!res.ok) {
                    console.error(`❌ [CLIMATIQ_REJECTED]: ${line.strategy} -> ${data.message}`);
                    return { success: false, error: data.message, co2e: 0, strategy: line.strategy };
                }

                // ÉXITO: Retorno limpio con valor real
                return {
                    success: true,
                    co2e: data.co2e || 0,
                    unit: data.co2e_unit || "kg",
                    strategy: line.strategy,
                    description: line.description
                };

            } catch (e) {
                // BLINDAJE 4: Error de red o timeout
                console.error(`❌ [NETWORK_ERROR]: ${line.strategy} -> ${e.message}`);
                return { success: false, error: e.message, co2e: 0, strategy: line.strategy };
            }
        });

        const results = await Promise.all(linePromises);
        
        // El reduce ahora es SEGURO porque curr.co2e siempre será un número (0 o el valor real)
        const total = results.reduce((acc, curr) => acc + (curr.co2e || 0), 0);

        if (total > 0) {
            // Buscamos la primera unidad válida para el log
            const firstUnit = results.find(r => r.success)?.unit || "kg";
            console.log(`✅ [CALCULATED]: ${total.toFixed(5)} ${firstUnit} CO2e`);
        }

        return {
            total_co2e: total,
            items: results,
            invoice_metadata: {
                vendor: meta.vendor?.name || "Unknown",
                invoice_no: meta.invoice_number || "N/A",
                invoice_date: meta.invoice_date || defaultResponse.invoice_metadata.invoice_date,
                total_amount_net: Number(meta.total_amount_net) || 0,
                currency: meta.currency || "EUR"
            }
        };

    } catch (err) {
        console.error("❌ [FATAL_INTERNAL_API_ERROR]:", err.message);
        return defaultResponse;
    }
}

module.exports = { calculateInClimatiq };