const { STRATEGIES } = require("./constants/climatiq_catalog");
const { entenderFacturaParaClimatiq } = require("./bedrock");

const CLIMATIQ_API_KEY = "2E44QNZJMX5X5B6EM43E88KRZ8"; 
const BASE_URL = "https://api.climatiq.io/data/v1";

function buildClimatiqParameters(strategy, line) {
    const val = Number(line.value) || 0;
    
    // Mapeo de unidades para evitar el error de 'kwh' inválido
    const unitMapping = {
        "kwh": "kWh",
        "kWh": "kWh",
        "kg": "kg",
        "t": "t",
        "km": "km"
    };

    const rawUnit = (line.unit || strategy.default_unit || "").toLowerCase();
    const cleanUnit = unitMapping[rawUnit] || rawUnit;

    switch (strategy.unit_type.toLowerCase()) {
        case "energy": return { energy: val, energy_unit: cleanUnit };
        case "weight": return { weight: val, weight_unit: cleanUnit };
        case "distance": return { distance: val, distance_unit: cleanUnit };
        case "weightoverdistance": 
            return { 
                weight: Number(line.logistics_meta?.weight) || 0, 
                weight_unit: "t",
                distance: Number(line.logistics_meta?.distance) || 0,
                distance_unit: "km"
            };
        default: return null;
    }
}

async function calculateInClimatiq(ocrSummary, queryHints = {}) {
    try {
        const fullAnalysis = await entenderFacturaParaClimatiq(ocrSummary, queryHints);
        const lines = fullAnalysis?.emission_lines || [];
        const meta = fullAnalysis?.extracted_data || {};

        if (!lines || lines.length === 0) {
            return { total_co2e: 0, items: [], invoice_metadata: meta };
        }

        const linePromises = lines.map(async (line) => {
            const strategy = STRATEGIES[line.strategy];
            if (!strategy) return { success: false, error: "Strategy Not Found", desc: line.description };

            const params = buildClimatiqParameters(strategy, line);

            try {
                const requestBody = JSON.stringify({
                    emission_factor: {
                        activity_id: strategy.activity_id,
                        data_version: "^1",
                        region: "GB", // O "ES" según prefieras
                        year: 2021
                    },
                    parameters: params
                });

                const res = await fetch(`${BASE_URL}/estimate`, {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${CLIMATIQ_API_KEY}`, 
                        "Content-Type": "application/json"
                    },
                    body: requestBody
                });

                const data = await res.json();
                
                if (!res.ok) {
                    console.error(`❌ [CLIMATIQ_REJECTED]: ${data.message}`);
                    return { success: false, error: data.message, desc: line.description };
                }

                // IMPORTANTE: Climatiq devuelve 'co2e' en la raíz del JSON
                return {
                    success: true,
                    co2e: data.co2e || 0,
                    unit: data.co2e_unit || "kg",
                    strategy: line.strategy,
                    description: line.description
                };
            } catch (e) {
                return { success: false, error: e.message, desc: line.description };
            }
        });

        const results = await Promise.all(linePromises);
        
        // Filtramos solo los éxitos para el cálculo total
        const successfulOnes = results.filter(r => r && r.success);
        const total = successfulOnes.reduce((acc, curr) => acc + (curr.co2e || 0), 0);

        // LOG DE CONTROL: Esto es lo que veías como 'undefined'
        if (successfulOnes.length > 0) {
            console.log(`✅ [CALCULATED]: ${total} ${successfulOnes[0].unit} CO2e`);
        }

        return {
            total_co2e: total,
            items: results, 
            invoice_metadata: {
                vendor: meta.vendor?.name || "Unknown",
                invoice_no: meta.invoice_number || "N/A",
                invoice_date: meta.invoice_date || new Date().toISOString().split('T')[0],
                total_amount_net: Number(meta.total_amount_net) || 0,
                currency: meta.currency || "EUR"
            }
        };

    } catch (err) {
        console.error("❌ [FATAL_INTERNAL_API_ERROR]:", err.message);
        // Retorno de emergencia para que el .reduce() de afuera no falle
        return { total_co2e: 0, items: [], invoice_metadata: {} };
    }
}

module.exports = { calculateInClimatiq };