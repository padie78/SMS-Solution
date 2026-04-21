/**
 * @fileoverview AppSync Resolver Handler - Orquestador de Configuraciones.
 * Mapeo estricto entre Schema GraphQL y configService.
 */
import { configService } from './services/config.js';

export const handler = async (event) => {
    try {
        const orgId = event.identity?.claims['custom:organization_id'] ||
            event.identity?.claims['sub'] ||
            "f3d4f8a2-90c1-708c-a446-2c8592524d62";

        const args = event.arguments || {};
        const methodName = event.info?.fieldName || event.fieldName;

        console.log(`[RESOLVER] Method: ${methodName} | Org: ${orgId}`);

        let result;

        switch (methodName) {
            // --- 1. CONFIGURACIONES Y USUARIOS ---
            case 'saveOrgConfig':
                result = await configService.saveOrgConfig(orgId, args.input);
                break;

            case 'saveUser': // Mapeado desde el schema
                result = await configService.saveUserProfile(orgId, args.input, event.identity);
                break;

            // --- 2. INFRAESTRUCTURA (Branches, Buildings, Meters) ---
            case 'createBranch':
                result = await configService.createBranch(orgId, args.input || args);
                break;

            case 'saveBuilding':
                result = await configService.saveBuilding(orgId, args.branchId, args.buildingId, args.input);
                break;

            case 'saveMeter': // Añadido según logs
                result = await configService.saveMeter(orgId, args.branchId, args.meterId, args.input);
                break;

            // --- 3. ACTIVOS Y CENTROS DE COSTOS ---
            case 'saveAsset': // Corregido: de 'createAsset' a 'saveAsset' para match con Schema
                result = await configService.saveAsset(orgId, args.assetId, args.input);
                break;

            case 'saveCostCenter':
                result = await configService.saveCostCenter(orgId, args.input);
                break;

            // --- 4. FINANZAS, TARIFAS Y REGLAS ---
            case 'saveTariff': // Match con el error de los logs
                result = await configService.saveUtilityTariff(orgId, args.input);
                break;

            case 'saveAlertRule': // Match con el error de los logs
                result = await configService.saveAlertRule(orgId, args.branchId, args.entityId, args.alertType, args.input);
                break;

            // --- 5. OPERACIONES Y EMISIONES ---
            case 'saveProductionLog': // Match con el error de los logs
                result = await configService.logProduction(orgId, args.input);
                break;

            case 'saveEmissionFactor': // Match con el error de los logs
                result = await configService.saveEmissionFactor(args.input);
                break;

            case 'confirmInvoice':
                result = await configService.confirmInvoice(orgId, args.sk, args.input);
                break;

            default:
                throw new Error(`Resolver handle for field "${methodName}" is not implemented.`);
        }

        return result;

    } catch (error) {
        console.error(`[LAMBDA FATAL ERROR] Method: ${methodName} | Message: ${error.message}`);
        return { 
            success: false, 
            message: error.message,
            id: null 
        };
    }
};