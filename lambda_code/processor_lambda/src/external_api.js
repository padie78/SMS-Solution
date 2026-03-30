const { STRATEGIES } = require("./constants/climatiq_catalog");
const { entenderFacturaParaClimatiq } = require("./bedrock");

// Recomendación: Mover esto a AWS Secrets Manager o Environment Variables
const CLIMATIQ_API_KEY = "2E44QNZJMX5X5B6EM43E88KRZ8"; 
const BASE_URL = "https://api.climatiq.io/data/v1";

/**
 * Construye los parámetros numéricos requeridos por Climatiq.
 * Asegura que los valores sean Numbers y no Strings para evitar 400 Bad Request.
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
 * Procesa la factura extraída por la IA y calcula las emisiones.
 */
async function calculateInClimatiq(ocrSummary, queryHints = {}) {
    try {
        // 1. Obtener análisis de Bedrock
        const fullAnalysis = await entenderFacturaParaClimatiq(ocrSummary, queryHints);
        
        // 2. Extraer líneas y metadatos con Fallbacks seguros
        const lines = fullAnalysis?.emission_lines || [];
        const meta = fullAnalysis?.extracted_data || {};

        if (lines.length === 0) {
            console.warn("⚠️ [SKIP]: No se detectaron líneas de emisión procesables.");
            return null;
        }

        // 3. Procesamiento en paralelo de cada línea
        const linePromises = lines.map(async (line) => {
            const strategy = STRATEGIES[line.strategy];
            
            if (!strategy) {
                return { success: false, error: `Strategy ${line.strategy} not found in catalog`, desc: line.description };
            }

            const params = buildClimatiqParameters(strategy, line);
            if (!params) {
                return { success: false, error: "Invalid parameter mapping", desc: line.description };
            }

            try {
                /**
                 * FIX CRUCIAL: Construcción manual del Body.
                 * Climatiq v32.32 requiere 'data_version' al inicio del stream JSON
                 * para evitar el error de validación en la columna 103.
                 */
                const requestBody = {
                    data_version: "32.32", // SIEMPRE PRIMERO
                    emission_factor: {
                        activity_id: strategy.activity_id
                    },
                    parameters: params
                };

                const res = await fetch(`${BASE_URL}/estimate`, {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${CLIMATIQ_API_KEY}`, 
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(requestBody)
                });

                const data = await res.json();
                
                if (!res.ok) {
                    console.error(`❌ [CLIMATIQ_ERROR]: ${line.strategy} -> ${data.message}`);
                    return { success: false, error: data.message, desc: line.description };
                }

                return {
                    success: true,
                    co2e: data.co2e || 0,
                    unit: data.co2e_unit,
                    strategy: line.strategy,
                    description: line.description,
                    activity_id: strategy.activity_id
                };

            } catch (e) {
                return { success: false, error: `Network/Parsing Error: ${e.message}` };
            }
        });

        // 4. Esperar resultados y consolidar
        const results = await Promise.all(linePromises);
        const successfulOnes = results.filter(r => r && r.success === true);

        // 5. Retorno estructurado para el index.js / DynamoDB
        return {
            total_co2e: successfulOnes.reduce((acc, curr) => acc + (curr.co2e || 0), 0),
            items: results, 
            invoice_metadata: {
                vendor: meta.vendor?.name || "Unknown Vendor",
                invoice_no: meta.invoice_number || "N/A",
                invoice_date: meta.invoice_date || new Date().toISOString().split('T')[0],
                total_amount_net: Number(meta.total_amount_net) || 0,
                currency: meta.currency || "EUR"
            }
        };

    } catch (err) {
        console.error("❌ [FATAL_EXTERNAL_API_ERROR]:", err.message);
        return null;
    }
}

module.exports = { calculateInClimatiq };