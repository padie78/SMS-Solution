import { STRATEGIES } from "../constants/climatiq_catalog.js";

export const calculateFootprint = async (lines, country = "ES") => {
    let totalKg = 0;
    let totalCo2 = 0;
    let totalCh4 = 0;
    let totalN2o = 0;
    
    const items = [];
    // Nota: Mantén tu token en variables de entorno por seguridad
    const CLIMATIQ_TOKEN = process.env.CLIMATIQ_TOKEN || "2E44QNZJMX5X5B6EM43E88KRZ8"; 

    for (const line of lines) {
        try {
            // 1. Normalización y Validación de entrada
            const strategy = STRATEGIES[line.category?.toUpperCase()] || STRATEGIES.ELEC;
            const value = parseFloat(line.value);
            const rawUnit = (line.unit || '').toLowerCase();

            // --- FILTRO DE SEGURIDAD (Evita el error 'EUR' is not a valid Weight unit) ---
            const forbiddenUnits = ['eur', 'usd', 'money', '€', '$'];
            if (forbiddenUnits.includes(rawUnit) || isNaN(value)) {
                console.warn(`   ⏭️ [SKIP_LINE]: Unidad inválida detectada (${rawUnit}). Saltando línea.`);
                continue; 
            }

            // Mapeo estricto de unidades para Climatiq
            let unit = 'kWh'; // Default para ELEC
            if (rawUnit !== 'kwh') {
                unit = 'kg'; // Fallback seguro para peso si no es energía
            }
            // -------------------------------------------------------------------------

            const body = {
                emission_factor: {
                    activity_id: strategy.activity_id,
                    region: country,
                    data_version: "^3" 
                },
                parameters: {
                    ...(unit === 'kWh' 
                        ? { energy: value, energy_unit: "kWh" } 
                        : { weight: value, weight_unit: unit })
                }
            };

            const res = await fetch("https://api.climatiq.io/data/v1/estimate", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${CLIMATIQ_TOKEN}`,
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) {
                // Si la API responde con error, lanzamos para ir al catch
                throw new Error(data.message || "Error en la API de Climatiq");
            }

            // 2. Acumulación de resultados
            totalKg += data.co2e;
            const gases = data.constituent_gases || {};
            
            totalCo2 += (gases.co2 || 0);
            totalCh4 += (gases.ch4 || 0);
            totalN2o += (gases.n2o || 0);

            items.push({
                description: line.description,
                original_value: value,
                original_unit: unit,
                co2e_kg: data.co2e,
                constituent_gases: gases,
                activity_id: strategy.activity_id,
                audit_trail: data.audit_trail 
            });

        } catch (err) {
            console.error(`   ⚠️ [LINE_ERROR] en "${line.description}": ${err.message}`);
        }
    }

    // 3. Retorno estructurado para el Mapper
    return { 
        total_kg: totalKg, 
        // Agregamos el activity_id del primer item para el Mapper
        activity_id: items[0]?.activity_id || "electricity-supply_grid_es",
        constituent_gases: {
            co2: totalCo2,
            ch4: totalCh4,
            n2o: totalN2o
        },
        items 
    };
};