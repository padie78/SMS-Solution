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
        const orgId = "f3d4f8a2-90c1-708c-a446-2c8592524d62";
        // 2. PARÁMETROS: Argumentos definidos en el Schema (.graphql)
        const args = event.arguments || {};
        
        // 3. ROUTING: Identificamos qué Query se disparó desde el Frontend
        const methodName = event.info?.fieldName;

        if (!orgId) {
            console.error("CRITICAL: No orgId found in identity claims.");
            throw new Error("Unauthorized: Missing organization context.");
        }

        /**
         * DISPATCHER LOGIC
         * Mapea cada 'fieldName' del Schema GraphQL a un método del Servicio.
         */
        switch (methodName) {
            
            case 'getYearlyKPI':
                // Dashboard Estratégico: Scorecards superiores
                return await analyticsService.getYearlyKPI(orgId, args.year);

            case 'getMonthlyKPI':
                // Dashboard Táctico: Comparativa MoM
                if (!args.month) throw new Error("Month argument is required for MonthlyKPI");
                return await analyticsService.getMonthlyKPI(orgId, args.year, args.month);

            case 'getEvolution':
                // Series Temporales: Gráficos de barras/líneas
                return await analyticsService.getEvolution(orgId, args.year, args.gasType || 'co2e');

            case 'getIntensity':
                // KPI de Eficiencia: kgCO2e / $
                return await analyticsService.getCarbonIntensity(orgId, args.year);

            case 'getForecast':
                // Business Intelligence: Proyección de cierre de año
                return await analyticsService.getForecast(orgId, args.year);

            case 'getAuditReport':
                // Gobernanza: Facturas con baja confianza de IA
                return await analyticsService.getAuditReport(orgId);

            case 'searchInvoices':
                // Exploración: Motor de búsqueda para el DataGrid
                // Pasamos todo el objeto args como filtros
                return await analyticsService.searchInvoices(orgId, args);

            default:
                console.warn(`Field name ${methodName} not recognized by the resolver.`);
                throw new Error(`Field ${methodName} not implemented in the Orchestrator.`);
        }

    } catch (error) {
        console.error("[RESOLVER ERROR]:", error);
        
        // En AppSync, lanzar un Error devuelve automáticamente un bloque "errors" en la respuesta GraphQL
        throw new Error(error.message || "Internal Analytics Error");
    }
};