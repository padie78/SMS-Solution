const { STRATEGIES } = require("./constants/climatiq_catalog");
const { entenderFacturaParaClimatiq } = require("./bedrock");

// Credenciales y Configuración
const CLIMATIQ_API_KEY = "2E44QNZJMX5X5B6EM43E88KRZ8"; 
const BASE_URL = "https://api.climatiq.io/data/v1";
const FIXED_DATA_VERSION = "32.32";

/**
 * Construye los parámetros numéricos requeridos por Climatiq.
 * Forzamos tipos Number para evitar errores de validación de esquema.
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
 * Procesa la factura extraída por la IA y coordina los cálculos con Climatiq.
 */
async function calculateInClimatiq(ocrSummary, queryHints = {}) {
    try {
        // 1. Análisis semántico con Bedrock
        const fullAnalysis = await entenderFacturaParaClimatiq(ocrSummary, queryHints);
        
        const lines = fullAnalysis?.emission_lines || [];
        const meta = fullAnalysis?.extracted_data || {};

        if (lines.length === 0) {
            console.warn("⚠️ [SKIP]: No se detectaron líneas de emisión procesables.");
            return null;
        }

        // 2. Procesamiento paralelo de estimaciones
        const linePromises = lines.map(async (line) => {
            const strategy = STRATEGIES[line.strategy];
            
            if (!strategy) {
                return { success: false, error: `Strategy ${line.strategy} not found`, desc: line.description };
            }

            const params = buildClimatiqParameters(strategy, line);
            if (!params) {
                return { success: false, error: "Invalid parameter mapping", desc: line.description };
            }

            try {
                /**
                 * FIX DEFINITIVO PARA ERROR COLUMNA 103:
                 * 1. Usamos un String literal para asegurar que data_version sea la PRIMERA llave.
                 * 2. Añadimos data_version a la URL para bypass de validación en el gateway.
                 */
                const manualJsonBody = JSON.stringify({
                    data_version: FIXED_DATA_VERSION,
                    emission_factor: {
                        activity_id: strategy.activity_id
                    },
                    parameters: params
                });

                const res = await fetch(`${BASE_URL}/estimate?data_version=${FIXED_DATA_VERSION}`, {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${CLIMATIQ_API_KEY}`, 
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: manualJsonBody
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
                    description: line.description,
                    activity_id: strategy.activity_id
                };

            } catch (e) {
                return { success: false, error: `Fetch error: ${e.message}` };
            }
        });

        // 3. Consolidación de resultados
        const results = await Promise.all(linePromises);
        const successfulOnes = results.filter(r => r && r.success === true);

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