import { STRATEGIES } from "../constants/climatiq_catalog.js";

/**
 * Servicio de Cálculo de Huella de Carbono (Climatiq API).
 * FIX: Reconstrucción total del objeto body para evitar colisiones de parámetros.
 */
export const calculateFootprint = async (lines, country = "ES") => {
    console.log(`   [CLIMATIQ_START]: Procesando ${lines?.length || 0} líneas para región: ${country}`);
    
    let totalKg = 0;
    const items = [];
    
    const CLIMATIQ_TOKEN = "2E44QNZJMX5X5B6EM43E88KRZ8";
    const DATA_VERSION = "32.32"; 

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
        return { total_tons: 0, total_kg: 0, items: [] };
    }

    for (const [index, line] of lines.entries()) {
        try {
            const unit = line.unit?.toLowerCase();
            const value = parseFloat(line.value);
            const activityId = line.activity_id || "electricity-supply_grid_mix";

            // --- 1. CONSTRUCCIÓN DEL PARÁMETRO SEGÚN UNIDAD ---
            let cleanParameters = {};

            if (unit === 'eur' || unit === 'usd') {
                cleanParameters = {
                    money: value,
                    money_unit: unit
                };
            } else if (unit === 'kwh') {
                cleanParameters = {
                    energy: value,
                    energy_unit: 'kwh'
                };
            } else if (unit === 'km') {
                cleanParameters = {
                    distance: value,
                    distance_unit: 'km'
                };
            } else if (unit === 'l' || unit === 'm3') {
                cleanParameters = {
                    volume: value,
                    volume_unit: unit
                };
            } else {
                // Para kg, t, etc.
                cleanParameters = {
                    weight: value,
                    weight_unit: unit || 'kg'
                };
            }

            // --- 2. MONTAJE DEL BODY (DATA_VERSION SIEMPRE PRIMERO) ---
            const body = {
                data_version: DATA_VERSION,
                emission_factor: { 
                    activity_id: activityId,
                    region: country 
                },
                parameters: cleanParameters
            };

            // LOG DE SEGURIDAD: Esto es lo que verás en CloudWatch
            console.log(`      📤 [PAYLOAD_ENVÍO_${index + 1}]:`, JSON.stringify(body));

            const res = await fetch("https://api.climatiq.io/data/v1/estimate", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${CLIMATIQ_TOKEN.trim()}`,
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorData = await res.json();
                // Si falla, el error de Climatiq te dirá exactamente en qué columna está el problema
                console.error(`      ❌ [API_ERROR_LINEA_${index + 1}]: ${errorData.message}`);
                continue;
            }

            const data = await res.json();
            const co2 = data.co2e || 0;
            
            console.log(`      ✅ [RESULTADO_LINEA_${index + 1}]: ${co2.toFixed(4)} kgCO2e`);

            totalKg += co2;
            items.push({ 
                ...line, 
                co2e_kg: co2,
                audit_trail: data.audit_trail 
            });

        } catch (error) {
            console.error(`      🚨 [NETWORK_ERROR_LINEA_${index + 1}]:`, error.message);
        }
    }

    console.log(`   [CLIMATIQ_END]: Total acumulado: ${totalKg.toFixed(4)} kgCO2e`);

    return { 
        total_tons: totalKg / 1000, 
        total_kg: totalKg,
        items 
    };
};

export default { calculateFootprint };