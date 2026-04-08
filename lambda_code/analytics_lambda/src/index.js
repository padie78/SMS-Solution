/**
 * @fileoverview AppSync Resolver Handler - Orquestador de Consultas GraphQL.
 * Con Logs de auditoría profunda para diagnóstico de nulos.
 */
import { analyticsService } from './services/analytics.js';

export const handler = async (event) => {
    // 1. Log de entrada completa (Verificar qué manda AppSync)
    console.log("== [APPSYNC EVENT FULL] ==");
    console.log(JSON.stringify(event, null, 2));

    try {
        const orgId = "f3d4f8a2-90c1-708c-a446-2c8592524d62"; 
        const args = event.arguments || {};
        const methodName = event.info?.fieldName;

        console.log(`== [ROUTING] == Method: ${methodName} | Org: ${orgId}`);
        console.log(`== [ARGS] ==`, JSON.stringify(args));

        if (!orgId) {
            console.error("CRITICAL: No orgId found.");
            throw new Error("Unauthorized: Missing organization context.");
        }

        let result;

        /**
         * DISPATCHER LOGIC
         */
        switch (methodName) {
            
            case 'getYearlyKPI':
                result = await analyticsService.getYearlyKPI(orgId, args.year);
                break;

            case 'getMonthlyKPI':
                if (!args.month) throw new Error("Month argument is required for getMonthlyKPI");
                result = await analyticsService.getMonthlyKPI(orgId, args.year, args.month);
                break;

            case 'getEvolution':
                result = await analyticsService.getEvolution(orgId, args.year);
                break;

            case 'getQuarterlyBreakdown':
                result = await analyticsService.getQuarterlyBreakdown(orgId, args.year);
                break;

            case 'getYearOverYear':
                // Log específico para YoY por ser propenso a errores de tipos
                console.log(`[DEBUG YoY] Parsing Month: ${args.month}, Year: ${args.year}`);
                result = await analyticsService.getYearOverYear(orgId, parseInt(args.month), parseInt(args.year));
                break;

            case 'getIntensity':
                result = await analyticsService.getIntensity(orgId, args.year);
                break;

            case 'getIntensityByService':
                result = await analyticsService.getIntensityByService(orgId, args.year);
                break;

            case 'getGoalTracking':
                console.log(`[DEBUG GOALS] Invoking for Year: ${args.year}`);
                result = await analyticsService.getGoalTracking(orgId, args.year);
                break;

            case 'getOffsetEstimation':
                console.log(`[DEBUG OFFSET] Invoking for Year: ${args.year}`);
                result = await analyticsService.getOffsetEstimation(orgId, args.year);
                break;

            case 'getForecast':
                result = await analyticsService.getForecast(orgId, args.year);
                break;

            case 'getAuditReport':
            case 'getAuditQueue':
                result = await analyticsService.getAuditQueue(orgId, args.year, args.month);
                break;

            case 'dataQualitySummary':
                result = await analyticsService.dataQualitySummary(orgId, args.year, args.month);
                break;

            case 'getVendorRanking':
                result = await analyticsService.getVendorRanking(orgId, args.year, args.limit || 5);
                break;

            case 'searchInvoices':
                result = await analyticsService.searchInvoices(orgId, args);
                break;

            default:
                console.warn(`[WARN] Field name ${methodName} not recognized.`);
                throw new Error(`Field ${methodName} not implemented in Resolver.`);
        }

        // 2. LOG CRÍTICO: Ver qué devuelve el Service antes de que AppSync lo procese
        console.log(`== [SUCCESS: ${methodName}] ==`);
        console.log("Raw Result from Service:", JSON.stringify(result, null, 2));
        
        // Validación interna para alertar en logs si el resultado es null antes de salir
        if (result === null || result === undefined) {
            console.error(`[CRITICAL] Service returned ${result} for ${methodName}. Check DynamoDB or Service Logic.`);
        }

        return result;

    } catch (error) {
        console.error("== [ERROR EN RESOLVER] ==");
        console.error("Method:", event.info?.fieldName);
        console.error("Stack:", error.stack);
        console.error("Message:", error.message);
        
        throw new Error(error.message || "Internal Analytics Error");
    }
};