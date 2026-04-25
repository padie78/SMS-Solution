/**
 * @fileoverview AppSync Orquestador - SMS Platform
 */
import { configService } from './services/config.js';

export const handler = async (event) => {
    const methodName = event.info?.fieldName || event.fieldName || "unknown";

    // 1. Identidad y Organización
    const orgId = event.identity?.claims['custom:organization_id'] ||
        event.identity?.claims['sub'] ||
        "f3d4f8a2-90c1-708c-a446-2c8592524d62";

    const args = event.arguments || {};

    // 2. Configuración de Infraestructura
    const bucket = process.env.S3_BUCKET_NAME || "sms-platform-storage-dev";

    console.log(`[RESOLVER] Method: ${methodName} | Org: ${orgId}`);

    try {
        let result;

        switch (methodName) {
            case 'processInvoice':
                // FIX: El frontend ahora envía la Key completa (timestamp-nombre.pdf)
                const s3Key = args.fileName;

                console.log(`[PIPELINE_INIT] Procesando factura con Key: "${s3Key}"`);

                if (!s3Key) {
                    throw new Error("Error: El nombre del archivo (fileName) no fue proporcionado.");
                }

                // Iniciamos el análisis inteligente con Bedrock & Textract
                result = await configService.processInvoiceIA(orgId, s3Key, bucket);
                break;

            case 'confirmInvoice':
                result = await configService.confirmInvoice(orgId, args.sk, args.input);
                break;

            case 'saveOrgConfig':
                result = await configService.saveOrgConfig(orgId, args.input);
                break;

            case 'saveUser':
                result = await configService.saveUser(orgId, args.userId, args.input);
                break;

            case 'createBranch':
                result = await configService.createBranch(orgId, args.input || args);
                break;

            case 'saveBuilding':
                result = await configService.saveBuilding(orgId, args.branchId, args.buildingId, args.input);
                break;

            case 'saveMeter':
                result = await configService.saveMeter(orgId, args.branchId, args.meterId, args.input);
                break;

            case 'saveAsset':
                result = await configService.saveAsset(orgId, args.assetId, args.input);
                break;

            case 'saveCostCenter':
                result = await configService.saveCostCenter(orgId, args.input);
                break;

            case 'saveTariff':
                result = await configService.saveTariff(orgId, args.branchId, args.serviceType, args.input);
                break;

            case 'saveAlertRule':
                result = await configService.saveAlertRule(orgId, args.branchId, args.entityId, args.alertType, args.input);
                break;

            case 'saveProductionLog':
                result = await configService.saveProductionLog(
                    args.orgId || orgId,
                    args.branchId,
                    args.period,
                    args.input
                );
                break;

            case 'saveEmissionFactor':
                result = await configService.saveEmissionFactor(args.input);
                break;

            default:
                throw new Error(`Resolver handler for field "${methodName}" is not implemented.`);
        }

        return result;
    } catch (error) {
        // Log detallado para CloudWatch
        console.error(`[LAMBDA FATAL ERROR] Method: ${methodName} | Message: ${error.message}`);

        // Retornamos un objeto que AppSync pueda entender como error sin romper el front
        return {
            success: false,
            message: error.message,
            vendor: 'ERROR',
            total: 0,
            co2e: 0
        };
    }
};