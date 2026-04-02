import { STRATEGIES } from "../constants/climatiq_catalog.js";

/**
 * Servicio de Cálculo de Huella de Carbono (Climatiq API).
 * Versión adaptada con Token inyectado y data_version 32.32.
 */
export const calculateFootprint = async (lines, country = "ES") => {
    console.log(`   [CLIMATIQ_START]: Procesando ${lines?.length || 0} líneas para región: ${country}`);
    
    let totalKg = 0;
    const items = [];
    
    // Token y Versión de API (Abril 2026)
    const CLIMATIQ_TOKEN = "2E44QNZJMX5X5B6EM43E88KRZ8";
    const DATA_VERSION = "32.32"; 

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
        console.warn(`   ⚠️ [CLIMATIQ_EMPTY]: No se recibieron líneas de emisión.`);
        return { total_tons: 0, total_kg: 0, items: [] };
    }

    for (const [index, line] of lines.entries()) {
        console.log(`      📝 [LINEA_${index + 1}]: ID: ${line.activity_id || 'N/A'} | Val: ${line.value} ${line.unit}`);

        try {
            // Construcción del Payload siguiendo el contrato de Climatiq v1
            const body = {
                data_version: DATA_VERSION,
                emission_factor: { 
                    activity_id: line.activity_id || "electricity-supply_grid_mix",
                    region: country 
                },
                parameters: { 
                    money: line.value, 
                    money_unit: line.unit 
                }
            };

            // Lógica de Swapping: Si es unidad física (kWh, kg, etc), cambiamos el parámetro
            const physicalUnits = ['kWh', 'kg', 't', 'km', 'l', 'm3'];
            if (physicalUnits.includes(line.unit.toLowerCase()) || (line.unit !== 'EUR' && line.unit !== 'USD')) {
                let unitType = 'weight'; // Default
                if (line.unit.toLowerCase() === 'kwh') unitType = 'energy';
                if (line.unit.toLowerCase() === 'km') unitType = 'distance';
                if (line.unit.toLowerCase() === 'l' || line.unit.toLowerCase() === 'm3') unitType = 'volume';

                body.parameters = {
                    [unitType]: line.value,
                    [`${unitType}_unit`]: line.unit.toLowerCase()
                };
            }

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

    console.log(`   [CLIMATIQ_END]: Proceso finalizado. Total: ${totalKg.toFixed(4)} kgCO2e`);

    return { 
        total_tons: totalKg / 1000, 
        total_kg: totalKg,
        items 
    };
};

export default { calculateFootprint };