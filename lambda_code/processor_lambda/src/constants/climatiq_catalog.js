module.exports = {
    /**
     * Diccionario de estrategias de cálculo de emisiones.
     * Cada nodo define el activity_id de Climatiq y cómo se debe tratar el dato extraído.
     */
    STRATEGIES: {
        // --- SCOPE 2: ELECTRICIDAD ---
        ELEC: {
            activity_id: "electricity-supply_grid-source_supplier_mix", 
            unit_type: "energy",
            default_unit: "kWh",
            description: "Consumo de red eléctrica"
        },

        // --- SCOPE 1: COMBUSTIBLES DIRECTOS ---
        GAS: {
            activity_id: "fuel-type_natural_gas-fuel_use_na",
            unit_type: "energy",
            default_unit: "kWh",
            description: "Gas natural estacionario"
        },
        FLEET: {
            activity_id: "passenger_vehicle-vehicle_type_car-fuel_source_diesel-engine_size_na-vehicle_age_na-vehicle_weight_na",
            unit_type: "distance",
            default_unit: "km",
            description: "Flota propia de vehículos (Diesel)"
        },
        BIOMASS: {
            activity_id: "fuel-type_wood_pellets-fuel_use_na",
            unit_type: "weight",
            default_unit: "kg",
            description: "Biomasa / Pellets de madera"
        },
        REFRIGERANTS: {
            activity_id: "refrigerant-type_r410a-usage_na", // Este cambia según el GAS_TYPE detectado
            unit_type: "weight",
            default_unit: "kg",
            description: "Recarga de gases refrigerantes (F-Gases)"
        },

        // --- SCOPE 3: LOGÍSTICA Y VIAJES ---
        LOGISTICS: {
            activity_id: "freight_vehicle-vehicle_type_hgv_rigid-fuel_source_diesel-vehicle_weight_gt_17t-percentage_load_avg",
            unit_type: "weightoverdistance",
            default_unit: "t.km",
            description: "Transporte pesado tercerizado"
        },
        HOTEL: {
            activity_id: "accommodation-type_hotel_stay",
            unit_type: "money", // O "number" según la región de Climatiq
            default_unit: "eur",
            description: "Noches de hotel en viajes de negocio"
        },
        CLOUDOPS: {
            activity_id: "cloud_computing-provider_aws-region_eu_central_1",
            unit_type: "money",
            default_unit: "eur",
            description: "Servicios de nube (IT Emissions)"
        },

        // --- GESTIÓN DE RESIDUOS (CIRCULARIDAD) ---
        WASTE_PAPER: {
            activity_id: "waste-type_paper-disposal_method_closed_loop",
            unit_type: "weight",
            default_unit: "kg",
            description: "Papel reciclado"
        },
        WASTE_MIXED: {
            activity_id: "waste-type_municipal_solid_waste-disposal_method_landfill",
            unit_type: "weight",
            default_unit: "kg",
            description: "Residuos sólidos en vertedero"
        },
        
        // --- RECURSOS HÍDRICOS ---
        WATER: {
            activity_id: "water-supply_fresh_water",
            unit_type: "volume",
            default_unit: "m3",
            description: "Consumo de agua de red"
        }
    }
};