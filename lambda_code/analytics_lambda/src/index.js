/**
 * @fileoverview AppSync Resolver Handler - Orquestador de Consultas GraphQL.
 * Sincronizado con el esquema de SKs: STATS#YEAR#YYYY, STATS#WEEK#YYYY#WXX, STATS#DAY#DD
 */
import { analyticsService } from './services/analytics.js';

export const handler = async (event) => {
    console.log("== [DEBUG: APPSYNC EVENT START] ==");
    
    try {
        // 1. Identidad: Extraemos el orgId (Prioridad a claims de Cognito)
        const orgId = event.identity?.claims['custom:organization_id'] || 
                      event.identity?.claims['sub'] || 
                      "f3d4f8a2-90c1-708c-a446-2c8592524d62"; 

        const args = event.arguments || {};
        const methodName = event.info?.fieldName || event.fieldName;

        console.log(`== [ROUTING] == Method: ${methodName} | Org: ${orgId}`);

        let result;

        /**
         * DISPATCHER LOGIC
         * Mapea las queries de GraphQL a los métodos del servicio
         */
        switch (methodName) {
            
            case 'getYearlyKPI':
                // SK en DB: STATS#YEAR#2026
                console.log(`[EXEC] Anual - Año: ${args.year}`);
                result = await analyticsService.getYearlyKPI(orgId, args.year);
                break;

            case 'getQuarterlyKPI':
                // SK en DB: STATS#YEAR#2026#Q1
                if (!args.quarter) throw new Error("Quarter is required (e.g., Q1, Q2)");
                console.log(`[EXEC] Trimestral - Año: ${args.year}, Q: ${args.quarter}`);
                result = await analyticsService.getQuarterlyKPI(orgId, args.year, args.quarter.toUpperCase());
                break;

            case 'getMonthlyKPI':
                // SK en DB: STATS#YEAR#2026#M03
                if (!args.month) throw new Error("Month is required");
                const formattedMonth = args.month.toString().padStart(2, '0');
                console.log(`[EXEC] Mensual - Año: ${args.year}, Mes: ${formattedMonth}`);
                result = await analyticsService.getMonthlyKPI(orgId, args.year, formattedMonth);
                break;

            case 'getWeeklyKPI':
                // SK en DB: STATS#WEEK#2026#W01
                if (!args.week) throw new Error("Week is required");
                const formattedWeek = args.week.toString().padStart(2, '0');
                console.log(`[EXEC] Semanal - Año: ${args.year}, Semana: ${formattedWeek}`);
                result = await analyticsService.getWeeklyKPI(orgId, args.year, formattedWeek);
                break;

            case 'getDailyKPI':
                // SK en DB: STATS#DAY#11
                if (!args.day) throw new Error("Day is required");
                console.log(`[EXEC] Diario - Día: ${args.day}`);
                result = await analyticsService.getDailyKPI(orgId, args.day);
                break;

            case 'getIntensityReport':
                console.log(`[EXEC] Reporte Intensidad - Año: ${args.year}`);
                result = await analyticsService.getIntensityReport(orgId, args.year);
                break;

            case 'getVendorRanking':
                const vYear = (args.year || "2026").toString();
                const vLimit = parseInt(args.limit || 5);
                result = await analyticsService.getVendorRanking(orgId, vYear, vLimit);
                break;

            case 'getInvoicesByPeriod':
                console.log(`[EXEC] Search Invoices - Año: ${args.year}, Mes: ${args.month}`);
                result = await analyticsService.getInvoicesByPeriod(orgId, args.year, args.month);
                break;

            default:
                console.warn(`[ERROR] Field "${methodName}" not implemented.`);
                throw new Error(`Resolver for ${methodName} not found.`);
        }

        return result;

    } catch (error) {
        console.error("== [LAMBDA ERROR] ==");
        console.error(`Message: ${error.message}`);
        throw new Error(error.message || "Internal Analytics Error");
    }
};