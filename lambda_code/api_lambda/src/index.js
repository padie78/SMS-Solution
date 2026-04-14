/**
 * @fileoverview AppSync Resolver Handler - Orquestador de Configuraciones.
 * Sincronizado con el patrón de Analytics para consistencia en el SMS.
 */
import { configService } from './services/config.js';

export const handler = async (event) => {
    console.log("== [DEBUG: CONFIG EVENT START] ==");

    try {
        // 1. Identidad: Extraemos el orgId (Misma lógica que Analytics)
        const orgId = event.identity?.claims['custom:organization_id'] ||
            event.identity?.claims['sub'] ||
            "f3d4f8a2-90c1-708c-a446-2c8592524d62";

        const args = event.arguments || {};
        const methodName = event.info?.fieldName || event.fieldName;

        console.log(`== [ROUTING] == Method: ${methodName} | Org: ${orgId}`);

        let result;

        /**
         * DISPATCHER LOGIC
         * Mapea las mutaciones de GraphQL a los métodos del servicio de configuración
         */
        switch (methodName) {

            case 'saveOrgConfig':
                console.log(`[EXEC] Guardando Configuración de Organización: ${orgId}`);
                result = await configService.saveOrgConfig(orgId, args.input);
                break;

            case 'saveBranchConfig':
                if (!args.input?.branchId) throw new Error("branchId is required for branch configuration");
                console.log(`[EXEC] Guardando Sucursal: ${args.input.branchId}`);
                result = await configService.saveBranchConfig(orgId, args.input);
                break;

            case 'saveUserProfile':
                if (!args.input?.userId) throw new Error("userId is required for profile configuration");
                console.log(`[EXEC] Guardando Perfil de Usuario: ${args.input.userId}`);
                // Pasamos identity para el login_history
                result = await configService.saveUserProfile(orgId, args.input, event.identity);
                break;

            // ... dentro del switch(methodName) ...

            case 'createAsset':
                const { name, type, description, branchId, building, area, climatiqId } = event.arguments;

                const assetId = `ASSET-${Date.now()}`;

                // El objeto que persistimos en DynamoDB con toda la data
                const fullAsset = {
                    PK: `ORG#${orgId}`,
                    SK: `ASSET#${assetId}`,
                    entity_type: "ASSET_CONFIG",
                    asset_info: { name, type, description, status: "ACTIVE" },
                    assignment: {
                        branch_id: branchId || "UNASSIGNED",
                        building: building || "MAIN",
                        area: area || "GENERAL"
                    },
                    emission_data: {
                        climatiq_activity_id: climatiqId || "pending",
                        scope: 1
                    },
                    metadata: { created_at: new Date().toISOString() }
                };

                result = await configService.createAsset(orgId, args.input || args); // ✅ Usa la lógica del service
                break;

            default:
                console.warn(`[ERROR] Field "${methodName}" not implemented.`);
                throw new Error(`Resolver for ${methodName} not found.`);
        }

        return result;

    } catch (error) {
        console.error("== [LAMBDA ERROR] ==");
        console.error(`Message: ${error.message}`);
        return { success: false, message: error.message };
    }
};