/**
 * @fileoverview Service Layer - Lógica de Negocio de Analíticas (SMS).
 * Centraliza la construcción de Sort Keys para el repositorio.
 */

import { repo } from '../repository/dynamo.js';

export const analyticsService = {

    /**
     * 1. ESTRATÉGICO: KPIs (Anuales, Mensuales y Trimestrales)
     */
    getYearlyKPI: async ({ year }, orgId) => {
        const SK = `STATS#YEAR#${year}`;
        const { Item } = await docClient.send(new getCommand({
            TableName: TABLE_NAME,
            Key: { PK: `ORG#${orgId}`, SK }
        }));

        if (!Item) return null;

        return {
            id: Item.SK,
            totalCo2eTon: Item.ghg_total_co2e_ton || 0,
            totalSpend: Item.financials_total_spend || 0,
            invoiceCount: Item.trazabilidad_total_invoices || 0,
            lastUpdated: Item.last_updated,
            byService: mapServiceBreakdown(Item),
            normalization: Item.normalization_kpis,
            environmental: Item.environmental_impact,
            weather: Item.weather_adjustment,
            metadata: Item.metadata
        };
    },

    getQuarterlyKPI: async ({ year, quarter }, orgId) => {
        const SK = `STATS#YEAR#${year}#${quarter}`; // ej: STATS#YEAR#2026#Q1
        const { Item } = await docClient.send(new getCommand({
            TableName: TABLE_NAME,
            Key: { PK: `ORG#${orgId}`, SK }
        }));

        return Item ? {
            id: Item.SK,
            totalCo2eTon: Item.ghg_total_co2e_ton || 0,
            totalSpend: Item.financials_total_spend || 0,
            invoiceCount: Item.trazabilidad_total_invoices || 0,
            byService: mapServiceBreakdown(Item),
            normalization: Item.normalization_kpis
        } : null;
    },
    getMonthlyKPI: async ({ year, month }, orgId) => {
        const m = month.padStart(2, '0');
        const SK = `STATS#YEAR#${year}#M${m}`;
        const { Item } = await docClient.send(new getCommand({
            TableName: TABLE_NAME,
            Key: { PK: `ORG#${orgId}`, SK }
        }));

        return Item ? {
            id: Item.SK,
            totalCo2eTon: Item.ghg_total_co2e_ton || 0,
            totalSpend: Item.financials_total_spend || 0,
            normalization: Item.normalization_kpis,
            byService: mapServiceBreakdown(Item)
        } : null;
    },
    getWeeklyKPI: async ({ year, week }, orgId) => {
        const w = week.padStart(2, '0');
        const SK = `STATS#WEEK#${year}#W${w}`;
        const { Item } = await docClient.send(new getCommand({
            TableName: TABLE_NAME,
            Key: { PK: `ORG#${orgId}`, SK }
        }));

        return Item ? {
            id: Item.SK,
            totalCo2eKg: Item.ghg_total_co2e_kg || 0,
            totalSpend: Item.financials_total_spend || 0,
            lastUpdated: Item.last_updated,
            byService: mapServiceBreakdown(Item),
            normalization: Item.normalization_kpis
        } : null;
    },

    getDailyKPI: async ({ day }, orgId) => {
        // En tu DB el SK es STATS#DAY#11
        const SK = `STATS#DAY#${day}`; 
        const { Item } = await docClient.send(new getCommand({
            TableName: TABLE_NAME,
            Key: { PK: `ORG#${orgId}`, SK }
        }));

        return Item ? {
            id: Item.SK,
            totalCo2eKg: Item.ghg_total_co2e_kg || 0,
            totalSpend: Item.financials_total_spend || 0,
            byService: mapServiceBreakdown(Item),
            normalization: Item.normalization_kpis
        } : null;
    },


    /**
     * 2. TENDENCIAS Y EVOLUCIÓN
     */
    getYearOverYear: async (orgId, month, year) => {
        const mStr = month.toString().padStart(2, '0');

        // Obtenemos los registros de este año y el anterior para el mismo mes
        const skCurrent = `STATS#MONTH#${year}#${mStr}`;
        const skPrev = `STATS#MONTH#${parseInt(year) - 1}#${mStr}`;

        const [currentStats, prevStats] = await Promise.all([
            repo.getStats(orgId, skCurrent),
            repo.getStats(orgId, skPrev)
        ]);

        const current = {
            emissions: parseFloat(currentStats?.total_co2e_kg || 0),
            spend: parseFloat(currentStats?.total_spend || 0)
        };
        const previous = {
            emissions: parseFloat(prevStats?.total_co2e_kg || 0),
            spend: parseFloat(prevStats?.total_spend || 0)
        };

        return {
            month: parseInt(month),
            currentYear: current,
            previousYear: previous,
            diffPercentageEmissions: calculateDiff(current.emissions, previous.emissions),
            efficiencyImprovement: previous.spend > 0 ? (current.emissions / current.spend) < (previous.emissions / previous.spend) : false
        };
    },

    /**
     * 3. AUXILIARES DE FORMATEO Y CÁLCULO
     */
    getVendorRanking: async (orgId, year, limit = 5) => {
        // En este caso, el repo debe traer todas las facturas del año para calcular el ranking
        const invoices = await repo.getYearlyInvoicesRaw(orgId, year);
        if (!invoices.length) return [];

        const totalOrgCo2 = invoices.reduce((acc, inv) => acc + parseFloat(inv.climatiq_result?.co2e || 0), 0);

        const rankingMap = invoices.reduce((acc, inv) => {
            const name = inv.extracted_data?.vendor || "Desconocido";
            const co2 = parseFloat(inv.climatiq_result?.co2e || 0);
            if (!acc[name]) acc[name] = { vendorName: name, totalCo2e: 0, totalInvoices: 0 };
            acc[name].totalCo2e += co2;
            acc[name].totalInvoices += 1;
            return acc;
        }, {});

        return Object.values(rankingMap)
            .map(v => ({
                ...v,
                totalCo2e: parseFloat(v.totalCo2e.toFixed(2)),
                percentageOfTotalOrgEmissions: totalOrgCo2 > 0 ? parseFloat(((v.totalCo2e / totalOrgCo2) * 100).toFixed(2)) : 0
            }))
            .sort((a, b) => b.totalCo2e - a.totalCo2e)
            .slice(0, limit);
    }
};

/**
 * HELPERS PRIVADOS
 */

// Normaliza el mapeo de campos de DynamoDB a GraphQL
const formatKPIData = (stats) => ({
    totalCo2e: parseFloat(stats.total_co2e_kg || 0),
    totalSpend: parseFloat(stats.total_spend || 0),
    invoiceCount: parseInt(stats.invoice_count || 0),
    lastFile: stats.last_file_processed || "Ninguno",
    byService: {
        ELEC: parseFloat(stats.service_ELEC_co2e || 0),
        GAS: parseFloat(stats.service_GAS_co2e || 0)
    }
});

// Calcula variaciones porcentuales
const calculateDiff = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return parseFloat((((curr - prev) / prev) * 100).toFixed(2));
};