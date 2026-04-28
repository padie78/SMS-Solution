import { STRATEGIES } from "../../constants/climatiq_catalog.js";
import { MOCK_EMISSION_FACTORS } from "../../mocks/factors.js";

const CLIMATIQ_MOCK_BASE = {
    co2e_unit: "kg",
    activity_id: "electricity-supply_grid-source_supplier_mix",
    audit_trail: "enabled",
};

/**
 * Calculates carbon footprint using Climatiq API (with Mock fallback).
 * @param {Array} lines - Extracted emission lines from AI.
 * @param {string} country - ISO Country code.
 */
export const calculateFootprint = async (lines, country = "ES") => {
    const startTime = Date.now();
    const CLIMATIQ_TOKEN = process.env.CLIMATIQ_TOKEN || "2E44QNZJMX5X5B6EM43E88KRZ8";
    const USE_MOCK = process.env.USE_CLIMATIQ_MOCK === 'true' || true; 

    let totalKg = 0;
    let totalCo2 = 0;
    const items = [];

    console.log(`[CLIMATIQ_START] Processing ${lines.length} lines. Mode: ${USE_MOCK ? 'MOCK' : 'LIVE'}`);

    for (const line of lines) {
        try {
            const category = line.category?.toUpperCase() || "ELEC";
            const strategy = STRATEGIES[category] || STRATEGIES.ELEC;
            const value = parseFloat(line.value);
            const rawUnit = (line.unit || '').toLowerCase();

            // Validation: Skip monetary units or invalid numbers
            const forbiddenUnits = ['eur', 'usd', 'money', '€', '$'];
            if (forbiddenUnits.includes(rawUnit) || isNaN(value)) {
                console.log(`[CLIMATIQ_SKIP] Invalid unit/value for: ${line.description}`);
                continue; 
            }

            const unit = rawUnit === 'kwh' ? 'kWh' : 'kg';
            let data;

            if (USE_MOCK) {
                // --- MOCK LOGIC ---
                const factor = MOCK_EMISSION_FACTORS[category] || MOCK_EMISSION_FACTORS.DEFAULT;
                const calculatedCo2 = value * factor;
                
                data = {
                    ...CLIMATIQ_MOCK_BASE,
                    co2e: calculatedCo2,
                    constituent_gases: { co2: calculatedCo2, ch4: 0, n2o: 0 }
                };
                console.log(`[CLIMATIQ_MOCK] [${category}] Calculated ${calculatedCo2}kg CO2e for "${line.description}"`);
            } else {
                // --- LIVE API CALL ---
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

                data = await res.json();
                if (!res.ok) throw new Error(`API Error: ${data.message || res.statusText}`);
            }

            // Aggregate totals
            totalKg += data.co2e;
            totalCo2 += (data.constituent_gases?.co2 || 0);

            items.push({
                description: line.description,
                original_value: value,
                original_unit: unit,
                co2e_kg: data.co2e,
                activity_id: data.activity_id,
                audit_trail: data.audit_trail 
            });

        } catch (err) {
            console.error(`[CLIMATIQ_LINE_ERROR] Failed line "${line.description}": ${err.message}`);
        }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[CLIMATIQ_SUCCESS] Total footprint: ${totalKg.toFixed(2)}kg CO2e. Time: ${duration}s`);

    return { 
        total_kg: totalKg, 
        activity_id: items[0]?.activity_id || "electricity-supply_grid_es",
        constituent_gases: { co2: totalCo2, ch4: 0, n2o: 0 },
        items 
    };
};