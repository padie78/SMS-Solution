/**
 * @fileoverview AppSync Resolver Handler - Orquestador de Consultas GraphQL.
 * Este componente actúa como el "Dispatcher" central que conecta el esquema de AppSync
 * con la lógica de negocio del Analytics Service.
 */
import { analyticsService } from './services/analytics.js'

export const handler = async (event) => {
    console.log("GraphQL Request:", JSON.stringify(event, null, 2));

    try {
        // 1. SEGURIDAD MULTI-TENANT: Extraemos el orgId de los Claims de Cognito vía AppSync Identity
        //const orgId = event.identity?.claims['custom:orgId'];
        const orgId = "f3d4f8a2-90c1-708c-a446-2c8592524d62"; // Sin el ORG#
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
         */
        switch (methodName) {
            
            case 'getYearlyKPI':
                console.log(`Invoking analyticsService.getYearlyKPI(${orgId}, ${args.year})`);
                result = await analyticsService.getYearlyKPI(orgId, args.year);
                break;

            case 'getMonthlyKPI':
                if (!args.month) throw new Error("Month argument is required for MonthlyKPI");
                console.log(`Invoking analyticsService.getMonthlyKPI(${orgId}, ${args.year}, ${args.month})`);
                result = await analyticsService.getMonthlyKPI(orgId, args.year, args.month);
                break;

            case 'getEvolution':
                console.log(`Invoking analyticsService.getEvolution(${orgId}, ${args.year}, ${args.gasType})`);
                result = await analyticsService.getEvolution(orgId, args.year, args.gasType || 'co2e');
                break;

            case 'getIntensity':
                console.log(`Invoking analyticsService.getIntensity(${orgId}, ${args.year})`);
                result = await analyticsService.getIntensity(orgId, args.year);
                break;

            case 'getForecast':
                console.log(`Invoking analyticsService.getForecast(${orgId}, ${args.year})`);
                result = await analyticsService.getForecast(orgId, args.year);
                break;

            case 'getAuditReport':
                console.log(`Invoking analyticsService.getAuditReport(${orgId})`);
                result = await analyticsService.getAuditReport(orgId);
                break;

            case 'searchInvoices':
                console.log(`Invoking analyticsService.searchInvoices(${orgId}, filters)`);
                result = await analyticsService.searchInvoices(orgId, args);
                break;

            default:
                console.warn(`Field name ${methodName} not recognized.`);
                throw new Error(`Field ${methodName} not implemented.`);
        }

        // LOG DE RESPUESTA: Aquí verás si el servicio devolvió ceros o datos reales
        console.log(`--- SUCCESS: [${methodName}] Result ---`);
        console.log(JSON.stringify(result, null, 2));
        
        return result;

    } catch (error) {
        console.error("--- ERROR EN RESOLVER ---");
        console.error("Method:", event.info?.fieldName);
        console.error("Details:", error);
        
        throw new Error(error.message || "Internal Analytics Error");
    }
};