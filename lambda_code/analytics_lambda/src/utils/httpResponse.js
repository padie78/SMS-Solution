import { analyticsService } from './services/analyticsService.js';
import { sendResponse } from './utils/httpResponse.js';

/**
 * @fileoverview Punto de entrada de la Lambda de Analíticas.
 * Actúa como orquestador (Dispatcher) que recibe las peticiones de Angular,
 * valida la identidad de la organización y deriva la lógica al servicio correspondiente.
 */

/**
 * Handler principal de AWS Lambda.
 * @param {Object} event - Objeto de evento de API Gateway.
 * @param {Object} event.queryStringParameters - Parámetros de la URL:
 * @param {string} orgId - ID de la organización (Obligatorio).
 * @param {string} viewType - Define la lógica: 'summary' (Totales), 'evolution' (Gráficos), 'audit' (Alertas), 'search' (Tablas).
 * @param {string} gasType - Tipo de emisión: 'co2', 'ch4', 'n2o' o 'co2e' (Equivalente).
 * @param {string} service - Rubro energético: 'ELEC' o 'GAS'.
 * @param {string} start/end - Rango de fechas para el periodo de facturación (ISO 8601).
 */
export const handler = async (event) => {
    // 1. Manejo de Preflight (CORS) si API Gateway no lo hace automáticamente
    if (event.httpMethod === 'OPTIONS') {
        return sendResponse(200, { message: "OK" });
    }

    try {
        const query = event.queryStringParameters || {};
        const { 
            orgId, 
            viewType, 
            year = "2026", 
            month, 
            service, 
            vendor,
            gasType = "co2e", // co2, ch4, n2o, co2e
            start, 
            end, 
            minAmount 
        } = query;

        // 2. Validación de seguridad mínima
        if (!orgId) {
            return sendResponse(400, { message: "El parámetro 'orgId' es obligatorio para filtrar por organización." });
        }

        let result;

        // 3. Ruteo Lógico basado en el 'viewType' solicitado por Angular
        switch (viewType) {
            
            case 'summary':
                // Para los widgets de totales (KPIs)
                result = await analyticsService.getSummary(orgId, year);
                break;

            case 'evolution':
                // Para gráficos de líneas/barras de ECharts (Histórico mensual)
                result = await analyticsService.getEvolution(orgId, year, gasType);
                break;

            case 'audit':
                // Para la bandeja de revisión de facturas con baja confianza
                result = await analyticsService.getAuditReport(orgId);
                break;

            case 'search':
            default:
                // Motor de búsqueda avanzado con todos los filtros combinados
                const filters = {
                    year,
                    month,
                    service, // ELEC, GAS, etc.
                    vendor,
                    gasType,
                    start,   // Fecha inicio periodo facturación
                    end,     // Fecha fin periodo facturación
                    minSpend: minAmount
                };
                result = await analyticsService.getAdvancedSearch(orgId, filters);
                break;
        }

        // 4. Respuesta Exitosa
        if (!result || (Array.isArray(result) && result.length === 0)) {
            return sendResponse(200, { message: "No se encontraron registros para los filtros aplicados", data: [] });
        }

        return sendResponse(200, result);

    } catch (error) {
        // 5. Gestión de Errores Críticos
        console.error("[ERROR ANALYTICS]:", error);
        return sendResponse(500, { 
            message: "Error interno al procesar las analíticas", 
            detail: error.message 
        });
    }
};