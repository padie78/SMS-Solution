/**
 * @fileoverview AppSync Resolver Handler - Orquestador Unificado de Analíticas.
 * Sincronizado con el Schema de GraphQL v2 (AnalyticsResponse).
 */
import { analyticsService } from './services/analytics.js';

export const handler = async (event) => {
    console.log("== [DEBUG: APPSYNC EVENT START] ==");

    try {
        // 1. Identidad: Prioridad a claims de Cognito (Organization ID)
        const orgId = event.identity?.claims['custom:organization_id'] ||
            event.identity?.claims['sub'] ||
            "f3d4f8a2-90c1-708c-a446-2c8592524d62";

        const args = event.arguments || {};
        const methodName = event.info?.fieldName || event.fieldName;

        console.log(`== [ROUTING] == Method: ${methodName} | Org: ${orgId}`);

        let result;

        /**
         * DISPATCHER LOGIC (Optimizado según nuevo Schema)
         */
        switch (methodName) {

            case 'getPrecalculatedKPI':
                /**
                 * Maneja AÑO, TRIMESTRE, MES y DÍA. 
                 * Cumple con las 24 preguntas mediante lectura directa O(1) de items STATS#.
                 */
                result = await analyticsService.getPrecalculatedKPI(orgId, args);
                break;

            case 'getConsumptionAnalytics':
                /**
                 * QUERY DINÁMICO (GSI1). 
                 * Filtro por entityId (Branch/Asset) y rango de fechas.
                 * Responde: #1 (Branch), #4 (Fugas), #12 (Eficiencia), #14 (Fantasmas), #22 (No aprovechada)
                 */
                result = await analyticsService.getConsumptionAnalytics(orgId, args);
                break;

            case 'getInvoicesByPeriod':
                // Listado de facturas para auditoría
                result = await analyticsService.getInvoicesByPeriod(orgId, args.year, args.month);
                break;

            case 'getIntensityReport':
                // Reporte específico de normalización
                result = await analyticsService.getIntensityReport(orgId, args.year);
                break;

            case 'getTariffsByBranch':
                // Listado de tarifas activas por sucursal
                result = await analyticsService.getTariffsByBranch(args.branchId);
                break;

            case 'getCostCenters':
                // Listado de centros de costo configurados
                result = await analyticsService.getCostCenters(orgId);
                break;

            default:
                console.warn(`[ERROR] Method "${methodName}" not implemented in AppSync Resolver.`);
                throw new Error(`Resolver for ${methodName} not found.`);
        }

        // AWS AppSync requiere que el objeto devuelto coincida con el tipo definido (AnalyticsResponse, etc.)
        return result;

    } catch (error) {
        console.error("== [LAMBDA ERROR] ==");
        console.error(`Message: ${error.message}`);
        // Retornamos el error para que AppSync lo maneje en el array "errors" de la respuesta
        throw new Error(error.message || "Internal Analytics Error");
    }
};