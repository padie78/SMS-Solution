import { STRATEGIES } from "../constants/climatiq_catalog.js";

export const calculateFootprint = async (lines, country = "ES") => {
    let totalKg = 0;
    const items = [];
    const CLIMATIQ_TOKEN = "2E44QNZJMX5X5B6EM43E88KRZ8";
    const DATA_VERSION = "32.32"; 

    for (const [index, line] of lines.entries()) {
        try {
            const rawCategory = line.category || "ELEC";
            const strategy = STRATEGIES[rawCategory.toUpperCase()] || STRATEGIES.ELEC;
            
            const value = parseFloat(line.value);
            const unit = line.unit?.toLowerCase();

            // --- NORMALIZACIÓN ESTRICTA DE PARÁMETROS ---
            let params = {};
            if (unit === 'kwh') {
                params = { energy: value, energy_unit: "kWh" }; // 'kWh' con W mayúscula
            } else if (unit === 'eur' || unit === 'usd') {
                params = { money: value, money_unit: unit };
            } else if (unit === 'km') {
                params = { distance: value, distance_unit: "km" };
            } else {
                params = { weight: value, weight_unit: unit || "kg" };
            }

            const body = {
                data_version: DATA_VERSION,
                emission_factor: { 
                    activity_id: strategy.activity_id
                    // Quitamos region para asegurar que no choque con el activity_id
                },
                parameters: params
            };

            // URL CON QUERY PARAM (Esto es lo que suele arreglar el error del selector)
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
                // Si falla, logueamos el error exacto y el requestId de Climatiq para soporte
                console.error(`      ❌ [API_ERROR_L${index + 1}]: ${responseData.message} (ID: ${responseData.request_id || 'N/A'})`);
                continue;
            }

            const co2 = responseData.co2e || 0;
            console.log(`      ✅ [OK_L${index + 1}]: ${co2.toFixed(4)} kgCO2e`);

            totalKg += co2;
            items.push({ 
                ...line, 
                co2e_kg: co2,
                audit_trail: responseData.audit_trail 
            });

        } catch (error) {
            console.error(`      🚨 [LINE_ERROR]:`, error.message);
        }
    }

    return { total_tons: totalKg / 1000, total_kg: totalKg, items };
};

export default { calculateFootprint };