/**
 * Single Source of Truth para reglas de negocio por categoría.
 */
const CATEGORY_RULES = {
    ELEC: {
        focus: "Extract Active Energy (kWh). Identify CUPS/Meter ID.",
        scope: "SCOPE_2",
        strategy: "ELECTRICITY",
        metadata: {
            meter_id: "string (CUPS)",
            is_renewable: "boolean",
            tariff_name: "string (e.g. 2.0TD)",
            voltage_level: "string (LOW/MEDIUM/HIGH)",
            is_estimated_reading: "boolean"
        }
    },
    GAS: {
        focus: "Extract Natural Gas consumption (kWh or m3). Identify Meter Serial.",
        scope: "SCOPE_1",
        strategy: "STATIONARY_COMBUSTION",
        metadata: {
            meter_id: "string",
            conversion_factor: "float",
            pressure_level: "string",
            is_estimated_reading: "boolean"
        }
    },
    LOGISTICS: {
        focus: "Extract Weight and Distance for Freight/Shipments.",
        scope: "SCOPE_3",
        strategy: "TRANSPORTATION",
        metadata: {
            weight_tons: "float",
            distance_km: "float",
            vehicle_plate: "string",
            fuel_type: "string",
            euro_standard: "string (e.g. EURO_6)"
        }
    },
    REFRIGERANTS: {
        focus: "Identify F-Gas type and recharge weight for HVAC maintenance.",
        scope: "SCOPE_1",
        strategy: "FUGITIVE_EMISSIONS",
        metadata: {
            gas_type: "string (e.g. R-410A, R-134a)",
            recharge_weight_kg: "float",
            equipment_id: "string",
            is_leak: "boolean"
        }
    },
    WASTE: {
        focus: "Extract waste weight and disposal method.",
        scope: "SCOPE_3",
        strategy: "WASTE_MANAGEMENT",
        metadata: {
            waste_type: "string (PAPER, PLASTIC, HAZARDOUS)",
            disposal_method: "string (RECYCLING, LANDFILL, INCINERATION)",
            weight_kg: "float"
        }
    },
    OTHERS: {
        focus: "General audit of consumption and accounting data.",
        scope: "SCOPE_3",
        strategy: "OTHER_INDIRECT",
        metadata: {
            service_id: "string",
            general_description: "string"
        }
    }
};

module.exports = { CATEGORY_RULES };