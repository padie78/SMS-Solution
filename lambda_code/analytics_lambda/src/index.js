/**
 * @fileoverview AppSync Resolver Handler - Orquestador de Consultas GraphQL.
 * Con lógica de fail-safe para enrutamiento y logs de auditoría.
 */
import { analyticsService } from './services/analytics.js';

export const handler = async (event) => {
    // 1. LOG DE ENTRADA: Captura el evento completo para depuración en CloudWatch
    console.log("== [DEBUG: APPSYNC EVENT START] ==");
    console.log(JSON.stringify(event, null, 2));

    try {
        // Contexto fijo (Normalmente vendría de ctx.identity, pero mantenemos tu lógica)
        const orgId = "f3d4f8a2-90c1-708c-a446-2c8592524d62"; 
        const args = event.arguments || {};
        
        /**
         * FAIL-SAFE ROUTING
         * AppSync JS Resolvers pueden poner el nombre del campo en diferentes lugares
         */
        const methodName = event.info?.fieldName || event.fieldName || event.method;

        console.log(`== [ROUTING] == Method: ${methodName} | Org: ${orgId}`);
        console.log(`== [ARGS RECEIVED] ==`, JSON.stringify(args));

        if (!orgId) {
            console.error("CRITICAL: No orgId found in context.");
            throw new Error("Unauthorized: Missing organization context.");
        }

        let result;

        /**
         * DISPATCHER LOGIC
         * Centraliza todas las llamadas al analyticsService
         */
        switch (methodName) {
            
            case 'getYearlyKPI':
                console.log(`[EXEC KPI] Año: ${args.year}, Org Id: ${orgId}`);
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
                console.log(`[EXEC YoY] Mes: ${args.month}, Año: ${args.year}`);
                // Forzamos tipos numéricos para evitar errores en cálculos matemáticos
                result = await analyticsService.getYearOverYear(
                    orgId, 
                    parseInt(args.month), 
                    parseInt(args.year)
                );
                break;

            case 'getIntensity':
                result = await analyticsService.getIntensity(orgId, args.year);
                break;

            case 'getIntensityByService':
                result = await analyticsService.getIntensityByService(orgId, args.year);
                break;

            case 'getGoalTracking':
                console.log(`[EXEC GOALS] Año: ${args.year || '2026'}`);
                result = await analyticsService.getGoalTracking(orgId, (args.year || "2026").toString());
                break;

            case 'getOffsetEstimation':
                console.log(`[EXEC OFFSET] Año: ${args.year || '2026'}`);
                result = await analyticsService.getOffsetEstimation(orgId, (args.year || "2026").toString());
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
                const vYear = (args.year || "2026").toString();
                const vLimit = parseInt(args.limit || 5);
                console.log(`[EXEC VENDORS] Year: ${vYear}, Limit: ${vLimit}`);
                result = await analyticsService.getVendorRanking(orgId, vYear, vLimit);
                break;

            case 'searchInvoices':
                result = await analyticsService.searchInvoices(orgId, args);
                break;

            default:
                console.error(`[ERROR] Field "${methodName}" not recognized in Switch.`);
                console.log("Keys en event:", Object.keys(event));
                throw new Error(`Field ${methodName} not implemented in Resolver.`);
        }

        // LOG DE ÉXITO: Permite validar el payload justo antes de salir de la Lambda
        console.log(`== [SUCCESS: ${methodName}] ==`);
        console.log("Raw Result from Service:", JSON.stringify(result, null, 2));
        
        if (result === null || result === undefined) {
            console.warn(`[WARN] Service returned empty for ${methodName}.`);
        }

        return result;

    } catch (error) {
        console.error("== [LAMBDA ERROR] ==");
        console.error(`Method: ${event.info?.fieldName || 'Unknown'}`);
        console.error(`Message: ${error.message}`);
        console.error(`Stack: ${error.stack}`);
        
        // Retornamos el error para que AppSync lo capture en el array de "errors"
        throw new Error(error.message || "Internal Analytics Error");
    }
};