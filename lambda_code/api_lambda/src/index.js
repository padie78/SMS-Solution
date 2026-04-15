/**
 * @fileoverview AppSync Resolver Handler - Orquestador de Configuraciones.
 * Integra la lógica de negocio del SMS con las peticiones de AppSync.
 */
import { configService } from './services/config.js';

export const handler = async (event) => {
    try {
        // 1. Extracción de Identidad (Multi-tenant)
        const orgId = event.identity?.claims['custom:organization_id'] ||
            event.identity?.claims['sub'] ||
            "f3d4f8a2-90c1-708c-a446-2c8592524d62";

        const args = event.arguments || {};
        const methodName = event.info?.fieldName || event.fieldName;

        console.log(`[RESOLVER] Method: ${methodName} | Org: ${orgId}`);

        let result;

        switch (methodName) {
            // --- 1. CONFIGURACIONES BASE ---
            case 'saveOrgConfig':
                result = await configService.saveOrgConfig(orgId, args.input);
                break;

            case 'saveUserProfile':
                result = await configService.saveUserProfile(orgId, args.input, event.identity);
                break;

            // --- 2. INFRAESTRUCTURA ---
            case 'createBranch':
                result = await configService.createBranch(orgId, args.input || args);
                break;

            case 'updateBranch':
                result = await configService.updateBranch(orgId, args.id, args.input || args);
                break;

            case 'saveBranchConfig':
                result = await configService.saveBranchConfig(orgId, args.input);
                break;

            // --- 3. ACTIVOS ---
            case 'createAsset':
                result = await configService.createAsset(orgId, args.input);
                break;

            case 'deleteAsset':
                result = await configService.deleteAsset(orgId, args.id);
                break;

            // --- 4. FINANZAS Y TARIFAS ---
            case 'saveCostCenter':
                result = await configService.saveCostCenter(orgId, args.input);
                break;

            case 'saveUtilityTariff':
                result = await configService.saveUtilityTariff(orgId, args.input);
                break;

            // --- 5. OPERACIONES Y FACTURACIÓN ---
            case 'logProduction':
                result = await configService.logProduction(orgId, args.input);
                break;

            // PASO 6: Aprobación
            case 'approveInvoice':
                result = await configService.approveInvoice(orgId, args.invoiceId, event.identity);
                break;

            default:
                throw new Error(`Resolver handle for field "${methodName}" is not implemented.`);
        }

        return result;

    } catch (error) {
        console.error(`[LAMBDA FATAL ERROR] Method: ${event.info?.fieldName} | Message: ${error.message}`);
        
        // Formato de error compatible con AppSync para evitar nulos inesperados
        return { 
            success: false, 
            message: error.message,
            id: null 
        };
    }
};