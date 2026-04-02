import { STRATEGIES } from "../constants/climatiq_catalog.js";

export const calculateFootprint = async (lines, country = "ES") => {
    console.log(`   [CLIMATIQ_START]: Procesando ${lines?.length || 0} líneas para región: ${country}`);
    
    let totalKg = 0;
    const items = [];
    const CLIMATIQ_TOKEN = "2E44QNZJMX5X5B6EM43E88KRZ8";
    const DATA_VERSION = "32.32"; 

    for (const [index, line] of lines.entries()) {
        try {
            // 1. Mapeo de Estrategia
            const rawCategory = line.category || "ELEC";
            const strategy = STRATEGIES[rawCategory.toUpperCase()] || STRATEGIES.ELEC;
            const realActivityId = strategy.activity_id;

            const value = parseFloat(line.value);
            const unit = line.unit?.toLowerCase();

            // 2. Normalización de Parámetros (Climatiq es sensible a las mayúsculas en kWh)
            let params = {};
            if (unit === 'kwh') {
                params = { energy: value, energy_unit: "kWh" };
            } else if (unit === 'eur' || unit === 'usd') {
                params = { money: value, money_unit: unit };
            } else if (unit === 'km') {
                params = { distance: value, distance_unit: "km" };
            } else if (unit === 't.km') {
                params = { weight: value, weight_unit: "t", distance: 1, distance_unit: "km" }; // Ajuste para logística si aplica
            } else {
                params = { weight: value, weight_unit: unit || "kg" };
            }

            // 3. Construcción del Body con Región (Obligatorio para evitar error 103)
            const body = {
                data_version: DATA_VERSION,
                emission_factor: { 
                    activity_id: realActivityId,
                    region: country // <--- REFUERZO: La región desempata el selector de la API
                },
                parameters: params
            };

            // URL con Query Param para forzar la versión del motor de cálculo
            const url = `https://api.climatiq.io/data/v1/estimate?data_version=${DATA_VERSION}`;

            console.log(`      📤 [PAYLOAD_ENVÍO_${index + 1}]:`, JSON.stringify(body));

            const res = await fetch(url, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${CLIMATIQ_TOKEN.trim()}`,
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify(body)
            });

            const responseData = await res.json();

            if (!res.ok) {
                console.error(`      ❌ [API_ERROR_L${index + 1}]: ${responseData.message} (ID: ${responseData.request_id || 'N/A'})`);
                continue;
            }

            const co2 = responseData.co2e || 0;
            console.log(`      ✅ [OK_L${index + 1}]: ${co2.toFixed(4)} kgCO2e`);

            totalKg += co2;
            items.push({ 
                ...line, 
                activity_id: realActivityId,
                co2e_kg: co2,
                audit_trail: responseData.audit_trail 
            });

        } catch (error) {
            console.error(`      🚨 [LINE_ERROR_L${index + 1}]:`, error.message);
        }
    }

    return { 
        total_tons: totalKg / 1000, 
        total_kg: totalKg, 
        items 
    };
};

export default { calculateFootprint };