const { STRATEGIES } = require("./constants/climatiq_catalog");
const { entenderFacturaParaClimatiq } = require("./bedrock");

// Configuración Base
const CLIMATIQ_API_KEY = "2E44QNZJMX5X5B6EM43E88KRZ8"; 
const BASE_URL = "https://api.climatiq.io/data/v1";
const VERSION = "32.32";

/**
 * Normaliza los parámetros para Climatiq asegurando tipos numéricos.
 */
function buildClimatiqParameters(strategy, line) {
    const val = Number(line.value) || 0;
    const unit = (line.unit || strategy.default_unit || "").toLowerCase();
    
    switch (strategy.unit_type) {
        case "energy": return { energy: val, energy_unit: unit };
        case "weight": return { weight: val, weight_unit: unit };
        case "distance": return { distance: val, distance_unit: unit };
        case "weightoverdistance": 
            return { 
                weight: Number(line.logistics_meta?.weight) || val, 
                weight_unit: "t",
                distance: Number(line.logistics_meta?.distance) || 0,
                distance_unit: "km"
            };
        default: return null;
    }
}

/**
 * Procesa el análisis de Bedrock y ejecuta las llamadas a Climatiq.
 */
async function calculateInClimatiq(ocrSummary, queryHints = {}) {
    try {
        // 1. Análisis de IA con Bedrock
        const fullAnalysis = await entenderFacturaParaClimatiq(ocrSummary, queryHints);
        const lines = fullAnalysis?.emission_lines || [];
        const meta = fullAnalysis?.extracted_data || {};

        if (lines.length === 0) return null;

        // 2. Mapeo de promesas para cálculo en paralelo
        const linePromises = lines.map(async (line) => {
            const strategy = STRATEGIES[line.strategy];
            if (!strategy) return { success: false, error: "Strategy Not Found", desc: line.description };

            const params = buildClimatiqParameters(strategy, line);
            if (!params) return { success: false, error: "Invalid Params", desc: line.description };

            try {
                /**
                 * SOLUCIÓN "NUCLEAR" AL ERROR 103:
                 * Construimos el JSON como un String Literal. 
                 * Esto evita que Node.js reordene las llaves y asegura que 
                 * 'data_version' sea lo primero que reciba el servidor.
                 */
                const manualRawBody = `{
                    "data_version": "${VERSION}",
                    "emission_factor": {
                        "activity_id": "${strategy.activity_id}"
                    },
                    "parameters": ${JSON.stringify(params)}
                }`;

                const res = await fetch(`${BASE_URL}/estimate?data_version=${VERSION}`, {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${CLIMATIQ_API_KEY}`, 
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: manualRawBody // Enviamos el string sin procesar por JSON.stringify
                });

                const data = await res.json();
                
                if (!res.ok) {
                    console.error(`❌ [CLIMATIQ_REJECTED]: ${line.strategy} -> ${data.message}`);
                    return { success: false, error: data.message, desc: line.description };
                }

                return {
                    success: true,
                    co2e: data.co2e || 0,
                    unit: data.co2e_unit,
                    strategy: line.strategy,
                    description: line.description
                };

            } catch (e) {
                return { success: false, error: e.message };
            }
        });

        // 3. Consolidación de resultados con Blindaje contra Undefined
        const results = await Promise.all(linePromises);
        
        // Blindaje: Aseguramos que results sea un array antes del filter/reduce
        const safeResults = results || [];
        const successfulOnes = safeResults.filter(r => r && r.success);

        return {
            total_co2e: successfulOnes.reduce((acc, curr) => acc + (curr.co2e || 0), 0),
            items: safeResults, 
            invoice_metadata: {
                vendor: meta.vendor?.name || "Unknown",
                invoice_no: meta.invoice_number || "N/A",
                invoice_date: meta.invoice_date || new Date().toISOString().split('T')[0],
                total_amount_net: Number(meta.total_amount_net) || 0,
                currency: meta.currency || "EUR"
            }
        };

    } catch (err) {
        console.error("❌ [FATAL_EXTERNAL_API_ERROR]:", err.message);
        // Retornamos un objeto mínimo para no romper el .reduce() del llamador
        return { total_co2e: 0, items: [], invoice_metadata: {} };
    }
}

module.exports = { calculateInClimatiq };