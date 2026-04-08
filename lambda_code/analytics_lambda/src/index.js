import { analyticsService } from './services/analytics.js';

export const handler = async (event) => {
    // LOG 1: Ver el evento crudo para identificar dónde viene el nombre del campo
    console.log("== [DEBUG: APPSYNC EVENT] ==");
    console.log(JSON.stringify(event, null, 2));

    try {
        const orgId = "f3d4f8a2-90c1-708c-a446-2c8592524d62"; 
        const args = event.arguments || {};
        
        // FAIL-SAFE: Intentamos obtener el nombre del campo de varias fuentes
        const methodName = event.info?.fieldName || event.fieldName || event.method;

        console.log(`== [ROUTING] == Buscando coincidencia para: "${methodName}"`);

        if (!orgId) {
            throw new Error("Unauthorized: Missing organization context.");
        }

        let result;

        switch (methodName) {
            // ... (casos anteriores se mantienen igual)

            case 'getVendorRanking':
                console.log(`[EXEC] Entrando a getVendorRanking con Year: ${args.year || '2026'} y Limit: ${args.limit || 5}`);
                // Aseguramos que el año sea un string, AppSync a veces manda números
                const yearStr = (args.year || "2026").toString();
                result = await analyticsService.getVendorRanking(orgId, yearStr, args.limit || 5);
                break;

            case 'getYearOverYear':
                console.log(`[EXEC] Entrando a getYearOverYear`);
                result = await analyticsService.getYearOverYear(orgId, parseInt(args.month), parseInt(args.year));
                break;

            case 'getGoalTracking':
                result = await analyticsService.getGoalTracking(orgId, (args.year || "2026").toString());
                break;

            case 'getOffsetEstimation':
                result = await analyticsService.getOffsetEstimation(orgId, (args.year || "2026").toString());
                break;

            // ... resto de casos

            default:
                // Log detallado del error de ruteo
                console.error(`[ERROR] Ruteo fallido. El campo "${methodName}" no existe en el Switch.`);
                console.log("Keys disponibles en event:", Object.keys(event));
                throw new Error(`Field "${methodName}" not implemented in Resolver.`);
        }

        console.log(`== [SUCCESS: ${methodName}] ==`);
        console.log("Result Payload:", JSON.stringify(result, null, 2));
        
        return result;

    } catch (error) {
        console.error("== [CRITICAL ERROR] ==");
        console.error(`Method Context: ${event.info?.fieldName || 'Unknown'}`);
        console.error(`Message: ${error.message}`);
        throw new Error(error.message || "Internal Analytics Error");
    }
};