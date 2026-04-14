/**
 * @fileoverview Service Layer - Lógica de Negocio de Configuración (SMS).
 * Centraliza la construcción de Sort Keys y el mapeo de estructuras para Single Table Design.
 */
import { repo } from '../repository/dynamo.js';

export const configService = {

    /**
     * 1. CONFIGURACIÓN DE ORGANIZACIÓN (METADATA)
     */
    saveOrgConfig: async (orgId, input) => {
        const SK = "METADATA";
        
        const item = {
            PK: orgId, // El repo se encarga del prefijo ORG#
            SK: SK,
            entity_type: "ORG_CONFIG",
            corporate_identity: {
                name: input.name,
                tax_id: input.taxId,
                hq_address: input.hqAddress
            },
            system_internal_config: {
                natural_gas_m3_to_kwh: Number(input.gasConversion || 10.55),
                min_confidence_score: Number(input.minConfidence || 0.85),
                default_currency: input.currency || "ILS",
                measurement_system: "METRIC"
            },
            billing_status: {
                plan_tier: "ENTERPRISE",
                status: "ACTIVE",
                renewal_date: "2027-01-01T00:00:00Z"
            },
            last_updated: new Date().toISOString()
        };

        await repo.saveItem(item);
        return { success: true, message: "ORG_CONFIG saved successfully" };
    },

    /**
     * 2. CONFIGURACIÓN DE SUCURSALES (BRANCH#...)
     */
    saveBranchConfig: async (orgId, input) => {
        // Construcción de la SK siguiendo el patrón del SMS
        const SK = `BRANCH#${input.branchId}`;
        
        const item = {
            PK: orgId,
            SK: SK,
            entity_type: "BRANCH_CONFIG",
            branch_details: {
                name: input.name,
                location_hierarchy: {
                    buildings: input.buildings || [],
                    areas: input.areas || []
                }
            },
            assets_inventory: [{
                asset_id: input.branchId,
                name: input.assetName || "Medidor Principal",
                climatiq_activity_id: input.climatiqId || "fuel-natural_gas-stationary_combustion",
                assignment: {
                    building: input.buildings?.[0] || "General",
                    area: input.areas?.[0] || "General"
                }
            }],
            local_thresholds: {
                co2e_monthly_limit_ton: 500.0
            },
            last_updated: new Date().toISOString()
        };

        await repo.saveItem(item);
        return { success: true, message: "BRANCH_CONFIG saved successfully" };
    },

    /**
     * 3. PERFIL DE USUARIO Y SEGURIDAD (USER#...)
     */
    saveUserProfile: async (orgId, input, identity) => {
        const SK = `USER#${input.userId}`;
        const isoNow = new Date().toISOString();

        const item = {
            PK: orgId,
            SK: SK,
            entity_type: "USER_PROFILE",
            user_profile: {
                full_name: input.fullName,
                email: input.email,
                interface_language: input.language || "es"
            },
            account_security: {
                current_status: "ACTIVE",
                confirmation_status: "VERIFIED",
                last_status_update: isoNow
            },
            login_history: [{
                timestamp: isoNow,
                ip_address: identity?.sourceIp?.[0] || "127.0.0.1",
                device_info: "AppSync Client / ConfigService",
                location_approx: "Be'er Sheva, IL"
            }],
            permissions: {
                role: input.role || "SUPER_ADMIN",
                authorized_branches: input.authorizedBranches || []
            },
            ux_settings: {
                dark_mode: true,
                push_notifications: true
            },
            last_updated: isoNow
        };

        await repo.saveItem(item);
        return { success: true, message: "USER_PROFILE saved successfully" };
    },

    createAsset: async (orgId, input) => {
    // Generamos el ID si no viene en el input para asegurar consistencia
    const assetId = input.assetId || `ASSET-${Date.now()}`;
    const now = new Date().toISOString();

    const item = {
        PK: `ORG#${orgId}`,
        SK: `ASSET#${assetId}`,
        entity_type: "ASSET_CONFIG",
        
        // 1. Información de Identidad Física
        asset_info: {
            name: input.name,
            type: input.type, // Ej: 'GAS_METER', 'VEHICLE', 'HVAC'
            status: "ACTIVE",
            description: input.description || `Activo registrado para ${input.name}`,
            serial_number: input.serialNumber || "N/A"
        },

        // 2. Jerarquía de Asignación (Fundamental para el Dashboard de la Planta)
        assignment: {
            branch_id: input.branchId || "UNASSIGNED",
            building: input.building || "MAIN_PLANT",
            area: input.area || "GENERAL_PRODUCTION",
            coordinates: input.coordinates || null // { lat: number, lng: number }
        },

        // 3. Motor de Cálculo (Climatiq Mapping)
        emission_data: {
            climatiq_activity_id: input.climatiqId || "fuel-natural_gas-stationary_combustion",
            unit_type: input.unitType || "m3", // m3, kWh, liters, etc.
            scope: input.scope || 1,           // Scope 1, 2 o 3
            category: input.category || "Stationary Combustion"
        },

        // 4. Auditoría y Control
        metadata: {
            created_at: now,
            last_updated: now,
            created_by: input.userId || "SYSTEM_API",
            version: 1
        }
    };

    try {
        // Persistencia en DynamoDB
        await repo.saveItem(item);
        
        // Retornamos el objeto completo como AWSJSON para que el Frontend lo use de inmediato
        return {
            success: true,
            message: `Asset ${assetId} [${input.name}] created and assigned to ${item.assignment.branch_id}`,
            data: JSON.stringify(item) 
        };
    } catch (error) {
        console.error("== [DYNAMO ERROR: createAsset] ==");
        console.error(error);
        throw new Error(`Failed to persist asset ${assetId}`);
    }
}
};