/**
 * @fileoverview AppSync Resolver Handler - Orquestador de Consultas GraphQL.
 * Este componente actúa como el "Dispatcher" central que conecta AppSync con el Analytics Service.
 */
import { analyticsService } from './services/analytics.js';

export const handler = async (event) => {
    // Console log inicial para debug en CloudWatch
    console.log("GraphQL Request:", JSON.stringify(event, null, 2));

    try {
        // 1. SEGURIDAD MULTI-TENANT: El orgId debe ser consistente con tu DynamoDB (ORG#id)
        const orgId = "f3d4f8a2-90c1-708c-a446-2c8592524d62"; 
        
        // 2. PARÁMETROS
        const args = event.arguments || {};
        const methodName = event.info?.fieldName;

        console.log(`Routing Request: [${methodName}] for Org: [${orgId}] with Args:`, JSON.stringify(args));

        if (!orgId) {
            console.error("CRITICAL: No orgId found.");
            throw new Error("Unauthorized: Missing organization context.");
        }

        let result;

        /**
         * DISPATCHER LOGIC
         * Mapea cada query del Schema de GraphQL a una función del Service.
         */
        switch (methodName) {
            
            // --- SCORECARDS ---
            case 'getYearlyKPI':
                result = await analyticsService.getYearlyKPI(orgId, args.year);
                break;

            case 'getMonthlyKPI':
                if (!args.month) throw new Error("Month argument is required for getMonthlyKPI");
                result = await analyticsService.getMonthlyKPI(orgId, args.year, args.month);
                break;

            // --- TENDENCIAS Y COMPARATIVAS ---
            case 'getEvolution':
                result = await analyticsService.getEvolution(orgId, args.year);
                break;

            case 'getQuarterlyBreakdown':
                result = await analyticsService.getQuarterlyBreakdown(orgId, args.year);
                break;

            case 'getYearOverYear':
                // Nota: Aseguramos que month y year sean enteros si el service lo requiere
                result = await analyticsService.getYearOverYear(orgId, parseInt(args.month), parseInt(args.year));
                break;

            // --- EFICIENCIA Y METAS ---
            case 'getIntensity':
                result = await analyticsService.getIntensity(orgId, args.year);
                break;

            case 'getIntensityByService':
                result = await analyticsService.getIntensityByService(orgId, args.year);
                break;

            case 'getGoalTracking':
                result = await analyticsService.getGoalTracking(orgId, args.year);
                break;

            case 'getOffsetEstimation':
                result = await analyticsService.getOffsetEstimation(orgId, args.year);
                break;

            case 'getForecast':
                result = await analyticsService.getForecast(orgId, args.year);
                break;

            // --- GOBERNANZA Y AUDITORÍA ---
            case 'getAuditReport':
                // Soporta tanto la versión global como la filtrada (Queue)
                result = await analyticsService.getAuditQueue(orgId, args.year, args.month);
                break;

            case 'getAuditQueue':
                result = await analyticsService.getAuditQueue(orgId, args.year, args.month);
                break;

            case 'dataQualitySummary':
                result = await analyticsService.dataQualitySummary(orgId, args.year, args.month);
                break;

            // --- PROVEEDORES ---
            case 'getVendorRanking':
                result = await analyticsService.getVendorRanking(orgId, args.year, args.limit || 5);
                break;

            // --- EXPLORACIÓN ---
            case 'searchInvoices':
                result = await analyticsService.searchInvoices(orgId, args);
                break;

            default:
                console.warn(`Field name ${methodName} not recognized.`);
                throw new Error(`Field ${methodName} not implemented in Resolver.`);
        }

        // LOG FINAL DE RESPUESTA
        console.log(`--- SUCCESS: [${methodName}] Result ---`);
        console.log(JSON.stringify(result, null, 2));
        
        return result;

    } catch (error) {
        console.error("--- ERROR EN RESOLVER ---");
        console.error("Method:", event.info?.fieldName);
        console.error("Details:", error.message);
        
        // AppSync capturará este error y lo mostrará en el array "errors" de la respuesta
        throw new Error(error.message || "Internal Analytics Error");
    }
};