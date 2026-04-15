/**
 * @fileoverview AppSync Resolver Handler - Orquestador de Configuraciones.
 */
import { configService } from './services/config.js';

export const handler = async (event) => {
    try {
        const orgId = event.identity?.claims['custom:organization_id'] ||
            event.identity?.claims['sub'] ||
            "f3d4f8a2-90c1-708c-a446-2c8592524d62";

        const args = event.arguments || {};
        const methodName = event.info?.fieldName || event.fieldName;

        let result;

        switch (methodName) {
            // --- INFRAESTRUCTURA ---
            case 'createBranch':
                result = await configService.createBranch(orgId, args);
                break;

            case 'updateBranch':
                result = await configService.updateBranch(orgId, args.id, args);
                break;

            // --- ACTIVOS ---
            case 'createAsset':
                result = await configService.createAsset(orgId, args.input);
                break;

            case 'deleteAsset':
                result = await configService.deleteAsset(orgId, args.id);
                break;

            // --- FINANZAS Y TARIFAS ---
            case 'saveCostCenter':
                result = await configService.saveCostCenter(orgId, args.input);
                break;

            case 'saveUtilityTariff':
                result = await configService.saveUtilityTariff(orgId, args.input);
                break;

            // --- OPERACIONES ---
            case 'logProduction':
                result = await configService.logProduction(orgId, args.input);
                break;

            case 'approveInvoice':
                result = await configService.approveInvoice(orgId, args.invoiceId, event.identity);
                break;

            // --- CONFIGURACIONES BASE ---
            case 'saveOrgConfig':
                result = await configService.saveOrgConfig(orgId, args.input);
                break;

            case 'saveBranchConfig':
                result = await configService.saveBranchConfig(orgId, args.input);
                break;

            case 'saveUserProfile':
                result = await configService.saveUserProfile(orgId, args.input, event.identity);
                break;

            default:
                throw new Error(`Resolver for ${methodName} not found.`);
        }

        return result;

    } catch (error) {
        console.error(`[LAMBDA ERROR] ${error.message}`);
        return { success: false, message: error.message };
    }
};