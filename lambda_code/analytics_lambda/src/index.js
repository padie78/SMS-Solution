/**
 * @fileoverview AppSync Resolver Handler - Orquestador de Consultas GraphQL.
 * Adaptado para manejar Sort Keys dinámicas según el tipo de métrica.
 */
import { analyticsService } from './services/analytics.js';

export const handler = async (event) => {
    console.log("== [DEBUG: APPSYNC EVENT START] ==");
    console.log(JSON.stringify(event, null, 2));

    try {
        // 1. Identidad: Extraemos el orgId de los claims de Cognito (Fail-safe al ID fijo)
        const orgId = event.identity?.claims['custom:organization_id'] || 
                      event.identity?.claims['sub'] || 
                      "f3d4f8a2-90c1-708c-a446-2c8592524d62"; 

        const args = event.arguments || {};
        const methodName = event.info?.fieldName || event.fieldName;

        console.log(`== [ROUTING] == Method: ${methodName} | Org: ${orgId}`);

        let result;

        /**
         * DISPATCHER LOGIC con construcción de SK dinámica
         */
        switch (methodName) {
            
            case 'getYearlyKPI':
                // SK: STATS#YEAR#2026#TOTAL
                console.log(`[EXEC] Anual - Año: ${args.year}`);
                result = await analyticsService.getYearlyKPI(orgId, args.year);
                break;

            case 'getQuarterlyKPI':
                // SK: STATS#QUARTER#2026#Q1
                if (!args.quarter) throw new Error("Quarter is required (e.g., Q1, Q2)");
                console.log(`[EXEC] Trimestral - Año: ${args.year}, Q: ${args.quarter}`);
                result = await analyticsService.getQuarterlyKPI(orgId, args.year, args.quarter.toUpperCase());
                break;

            case 'getMonthlyKPI':
                // SK: STATS#MONTH#2026#04
                if (!args.month) throw new Error("Month is required");
                // Aseguramos formato 01, 02...
                const formattedMonth = args.month.toString().padStart(2, '0');
                console.log(`[EXEC] Mensual - Año: ${args.year}, Mes: ${formattedMonth}`);
                result = await analyticsService.getMonthlyKPI(orgId, args.year, formattedMonth);
                break;

            case 'getYearOverYear':
                // YoY suele comparar meses específicos
                const yoyMonth = (args.month || new Date().getMonth() + 1).toString().padStart(2, '0');
                console.log(`[EXEC YoY] Mes: ${yoyMonth}, Año: ${args.year}`);
                result = await analyticsService.getYearOverYear(orgId, yoyMonth, args.year);
                break;

            case 'getVendorRanking':
                const vYear = (args.year || "2026").toString();
                const vLimit = parseInt(args.limit || 5);
                result = await analyticsService.getVendorRanking(orgId, vYear, vLimit);
                break;

            // ... otros casos (mantenemos la estructura anterior)
            case 'getGoalTracking':
                result = await analyticsService.getGoalTracking(orgId, (args.year || "2026").toString());
                break;

            default:
                console.warn(`[ERROR] Field "${methodName}" not implemented.`);
                throw new Error(`Resolver for ${methodName} not found.`);
        }

        console.log(`== [SUCCESS: ${methodName}] ==`);
        console.log("Raw Result:", JSON.stringify(result));
        
        return result;

    } catch (error) {
        console.error("== [LAMBDA ERROR] ==");
        console.error(`Message: ${error.message}`);
        throw new Error(error.message || "Internal Analytics Error");
    }
};