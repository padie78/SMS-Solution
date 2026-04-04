import { analyticsService } from './services/analyticsService.js';
import { sendResponse } from './utils/httpResponse.js';

export const handler = async (event) => {
    try {
        const { orgId, year, viewType } = event.queryStringParameters || {};
        const targetYear = year || "2026";

        if (!orgId) return sendResponse(400, { error: "orgId es requerido" });

        let result;

        switch (viewType) {
            case 'summary':
                result = await analyticsService.getQuickSummary(orgId, targetYear);
                break;
            case 'breakdown':
                result = await analyticsService.getServiceBreakdown(orgId, targetYear);
                break;
            case 'evolution':
                result = await analyticsService.getMonthlyEvolution(orgId, targetYear);
                break;
            default:
                // Por defecto devolvemos todo para el dashboard inicial
                result = {
                    summary: await analyticsService.getQuickSummary(orgId, targetYear),
                    breakdown: await analyticsService.getServiceBreakdown(orgId, targetYear),
                    evolution: await analyticsService.getMonthlyEvolution(orgId, targetYear)
                };
        }

        return sendResponse(200, result || { message: "No se encontraron datos" });
    } catch (error) {
        console.error(error);
        return sendResponse(500, { error: "Internal Server Error", detail: error.message });
    }
};