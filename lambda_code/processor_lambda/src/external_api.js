const { STRATEGIES, DATA_VERSION } = require("./constants/climatiq_catalog");
const { entenderFacturaParaClimatiq } = require("./bedrock");

const CLIMATIQ_API_KEY = process.env.CLIMATIQ_API_KEY; 
const BASE_URL = "https://api.climatiq.io/data/v1";

/**
 * Helper: Mapea los datos de la IA al formato exacto que pide Climatiq según la estrategia
 */
function buildClimatiqParameters(strategy, line) {
    const unit = line.unit?.toLowerCase() || strategy.default_unit;
    
    switch (strategy.unit_type) {
        case "energy":
            return { energy: line.value, energy_unit: unit };
        
        case "weightoverdistance":
            return {
                weight: line.logistics_meta?.weight || line.value || 0,
                weight_unit: "t",
                distance: line.logistics_meta?.distance || 0,
                distance_unit: "km"
            };
        
        case "distance":
            return { 
                distance: line.logistics_meta?.distance || line.value || 0, 
                distance_unit: unit 
            };
        
        case "weight":
            return { weight: line.value, weight_unit: unit };
            
        default:
            return null;
    }
}

/**
 * Orquestador de Cálculo: Procesa N líneas de emisión de una factura en paralelo
 */
async function calculateInClimatiq(ocrSummary, queryHints = {}) {
    try {
        // 1. Invocación a Bedrock (IA)
        const fullAnalysis = await entenderFacturaParaClimatiq(ocrSummary, queryHints);
        
        // Debug para ver qué devolvió la IA en CloudWatch
        console.log("🔍 [AI_FULL_ANALYSIS]:", JSON.stringify(fullAnalysis, null, 2));

        // 2. Validación de Estructura (Evita el error 'Cannot read properties of undefined reading map')
        const lines = fullAnalysis?.emission_lines || fullAnalysis?.line_items || [];
        const extractedData = fullAnalysis?.extracted_data || {};

        if (lines.length === 0) {
            console.error("⚠️ [DATA_ISSUE]: Bedrock no devolvió líneas de emisión válidas.");
            throw new Error("La IA no detectó ítems procesables en esta factura.");
        }

        // 3. Loop Asíncrono (Parallel Processing)
        const linePromises = lines.map(async (line) => {
            const strategy = STRATEGIES[line.strategy];
            
            if (!strategy) {
                console.warn(`⚠️ [STRATEGY_NOT_FOUND]: ${line.strategy} en la línea: ${line.description}`);
                return { 
                    success: false, 
                    error: "Strategy not supported", 
                    description: line.description 
                };
            }

            const parameters = buildClimatiqParameters(strategy, line);
            if (!parameters) {
                return { success: false, error: "Invalid parameters mapping", description: line.description };
            }

            try {
                // Petición atómica a Climatiq
                const res = await fetch(`${BASE_URL}/estimate`, {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${CLIMATIQ_API_KEY}`, 
                        "Content-Type": "application/json" 
                    },
                    body: JSON.stringify({
                        data_version: DATA_VERSION || "^1",
                        emission_factor: { 
                            activity_id: strategy.activity_id, 
                            region: line.region || "GB" 
                        },
                        parameters
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    return { 
                        success: false, 
                        error: data.message || "Climatiq Error", 
                        description: line.description 
                    };
                }

                return {
                    success: true,
                    co2e: data.co2e,
                    unit: data.co2e_unit,
                    strategy: line.strategy,
                    description: line.description,
                    activity_id: strategy.activity_id
                };

            } catch (err) {
                return { success: false, error: err.message, description: line.description };
            }
        });

        // 4. Esperamos todos los resultados simultáneamente
        const results = await Promise.all(linePromises);

        // 5. Consolidación Final
        const successfulOnes = results.filter(r => r.success);

        return {
            total_co2e: successfulOnes.reduce((acc, curr) => acc + curr.co2e, 0),
            items: results, // Enviamos éxitos y fallos para que la DB guarde el log completo
            invoice_metadata: {
                vendor: extractedData.vendor,
                invoice_no: extractedData.invoice_number,
                invoice_date: extractedData.invoice_date,
                billing_period: extractedData.billing_period,
                total_amount_net: extractedData.total_amount_net,
                currency: extractedData.currency
            }
        };

    } catch (err) {
        console.error("❌ [FATAL_LOOP_ERROR]:", err.message);
        // Retornamos null para que el index.js sepa que debe marcar la factura como ERROR o PENDING
        return null;
    }
}

module.exports = { calculateInClimatiq };