// 1. Importación con extensión .js (obligatoria en ESM)
import { STRATEGIES } from "../constants/climatiq_catalog.js";

/**
 * Servicio de Cálculo de Huella de Carbono (Climatiq API).
 * Traduce líneas de emisión auditadas por la IA en kgCO2e reales.
 * * @param {Array} lines - Array de objetos con { strategy, value, unit }
 * @returns {Promise<Object>} - Resumen de emisiones totales y desglose por línea.
 */
export const calculateFootprint = async (lines) => {
    let totalKg = 0;
    const items = [];

    // Validamos si hay líneas para procesar
    if (!lines || !Array.isArray(lines)) {
        return { total_tons: 0, items: [] };
    }

    for (const line of lines) {
        const strategy = STRATEGIES[line.strategy];
        
        // Si la estrategia no existe en nuestro catálogo, saltamos la línea
        if (!strategy) {
            console.warn(`⚠️ [CLIMATIQ]: Estrategia no encontrada para: ${line.strategy}`);
            continue;
        }

        try {
            // Usamos el fetch nativo de Node.js 20
            const res = await fetch("https://api.climatiq.io/data/v1/estimate", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${process.env.CLIMATIQ_API_KEY}`,
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify({
                    emission_factor: { 
                        activity_id: strategy.activity_id 
                    },
                    parameters: { 
                        [strategy.unit_type]: line.value, 
                        [`${strategy.unit_type}_unit`]: line.unit 
                    }
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error(`❌ [CLIMATIQ_API_ERROR]: ${errorData.message || res.statusText}`);
                continue;
            }

            const data = await res.json();
            const co2 = data.co2e || 0;
            
            totalKg += co2;
            items.push({ 
                ...line, 
                co2e_kg: co2,
                audit_trail: data.audit_trail // Guardamos rastro de auditoría de Climatiq
            });

        } catch (error) {
            console.error(`🚨 [CLIMATIQ_NETWORK_ERROR]:`, error.message);
        }
    }

    return { 
        total_tons: totalKg / 1000, 
        total_kg: totalKg,
        items 
    };
};

// 2. Exportación por defecto para mantener consistencia
export default { calculateFootprint };