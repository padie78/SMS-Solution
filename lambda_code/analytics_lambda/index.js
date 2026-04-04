import { analyticsService } from './services/analyticsService.js';
import { sendResponse } from './utils/httpResponse.js';

export const handler = async (event) => {
    try {
        // 1. Extraemos el orgId del Token de Cognito (Claims)
        // Nota: Asegúrate de que en Cognito el campo se llame 'custom:orgId'
        const claims = event.requestContext?.authorizer?.claims;
        const orgId = claims ? claims['custom:orgId'] : null;

        // 2. Validación crítica
        if (!orgId) {
            console.error("ERROR: Token sin claim 'custom:orgId' o no autorizado");
            return sendResponse(401, { message: "No autorizado: ID de organización no encontrado en el token" });
        }

        // 3. Los demás filtros sí pueden venir de la URL (son preferencias, no identidad)
        const query = event.queryStringParameters || {};
        const { viewType, year = "2026", gasType = "co2e" } = query;

        let result;

        // 4. Inyectamos el orgId del token en todas las llamadas al servicio
     /**
         * API ROUTER / DISPATCHER
         * Orquesta las peticiones hacia la Capa de Servicio basándose en el 'viewType'.
         * El 'orgId' inyectado desde el Token garantiza que un usuario solo acceda a su Tenant.
         */
        switch (viewType) {
            
            // 1. DASHBOARD ESTRATÉGICO: KPIs de alto nivel (Total Anual).
            // Ideal para las "Scorecards" superiores: Emisiones totales vs Gasto total del año.
            case 'yearly-kpi':
                result = await analyticsService.getYearlySummary(orgId, year);
                break;

            // 2. DASHBOARD TÁCTICO: Detalle de un mes específico con comparativa MoM (Month over Month).
            // Requiere validación del parámetro 'month' para evitar cálculos nulos en el servicio.
            case 'monthly-kpi':
                if (!query.month) {
                    return sendResponse(400, { message: "El parámetro 'month' (01-12) es obligatorio para esta vista." });
                }
                result = await analyticsService.getMonthlySummary(orgId, year, query.month);
                break;

            // 3. EFICIENCIA OPERATIVA: Ratio de Intensidad de Carbono (CO2e / $).
            // KPI crítico para medir si la empresa está creciendo de forma sostenible (Decoupling).
            // Permite normalizar el impacto ambiental independientemente del tamaño del negocio.
            case 'intensity': 
                result = await analyticsService.getCarbonIntensity(orgId, year);
                break;

            // 4. BUSINESS INTELLIGENCE: Proyección lineal de cierre de año.
            // Utiliza la tendencia de los meses cargados para predecir si se cumplirá el presupuesto
            // de carbono al finalizar el periodo actual.
            case 'forecast': 
                result = await analyticsService.getProjection(orgId, year);
                break;

            // 5. SERIES TEMPORALES: Datos para gráficos de líneas/barras (ECharts).
            // Devuelve un array de 12 meses. Soporta 'gasType' para alternar entre CO2, CH4 o N2O.
            case 'evolution':
                result = await analyticsService.getEvolution(orgId, year, gasType);
                break;

            // 6. GOBERNANZA Y CALIDAD: Reporte de integridad de datos.
            // Filtra facturas donde el motor de IA tuvo un confidence_score < 90%.
            // Es la herramienta principal para el equipo de auditoría ambiental.
            case 'audit':
                result = await analyticsService.getAuditReport(orgId);
                break;

            // 7. EXPLORACIÓN DE DATOS: Motor de búsqueda y filtrado granular.
            // Caso por defecto: Maneja filtros de proveedores, fechas exactas, montos y servicios.
            // Alimenta la tabla principal (DataGrid) de la aplicación Angular.
            default:
                result = await analyticsService.getAdvancedSearch(orgId, query);
                break;
        }

        return sendResponse(200, result);

    } catch (error) {
        console.error("[FATAL ERROR]:", error);
        return sendResponse(500, { message: "Error interno del servidor" });
    }
};