/**
 * @fileoverview Service Layer - Lógica de Negocio de Analíticas (SMS).
 * Maneja la transformación de datos, cálculos proactivos y comparativas interanuales.
 */

import { repo } from '../repository/dynamo.js';

export const analyticsService = {

    /**
     * 1. ESTRATÉGICO: KPIs Anuales y Mensuales.
     */
    getYearlyKPI: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return null;

        return {
            totalCo2e: parseFloat(stats.total_co2e_kg || 0),
            totalSpend: parseFloat(stats.total_spend || 0),
            invoiceCount: parseInt(stats.invoice_count || 0),
            lastFile: stats.last_file_processed || "Ninguno",
            byService: {
                ELEC: parseFloat(stats.service_ELEC_co2e || 0),
                GAS: parseFloat(stats.service_GAS_co2e || 0)
            }
        };
    },

    getMonthlyKPI: async (orgId, year, month) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return null;

        const currentM = month.toString().padStart(2, '0');
        const monthInt = parseInt(currentM);
        const prevMonthStr = (monthInt - 1).toString().padStart(2, '0');

        const getVal = (m, type) => parseFloat(stats[`month_${m}_${type}`] || 0);

        const currentCo2 = getVal(currentM, 'co2e');
        const currentSpend = getVal(currentM, 'spend');
        const prevCo2 = monthInt > 1 ? getVal(prevMonthStr, 'co2e') : 0;
        const prevSpend = monthInt > 1 ? getVal(prevMonthStr, 'spend') : 0;

        const calculateDiff = (curr, prev) => (prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100);

        return {
            month: currentM, year,
            emissions: {
                value: currentCo2,
                previousValue: prevCo2,
                diffPercentage: parseFloat(calculateDiff(currentCo2, prevCo2).toFixed(2))
            },
            spend: {
                value: currentSpend,
                previousValue: prevSpend,
                diffPercentage: parseFloat(calculateDiff(currentSpend, prevSpend).toFixed(2))
            },
            isEmissionsUp: currentCo2 > prevCo2,
            isSpendUp: currentSpend > prevSpend
        };
    },

    /**
     * 2. TENDENCIAS Y EVOLUCIÓN
     */
    getEvolution: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

        if (!stats) return months.map(m => ({ label: `Mes ${m}`, emissions: 0, spend: 0 }));

        return months.map(m => ({
            label: `Mes ${m}`,
            emissions: parseFloat(stats[`month_${m}_co2e`] || 0),
            spend: parseFloat(stats[`month_${m}_spend`] || 0)
        }));
    },

    getQuarterlyBreakdown: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return null;

        const getQ = (m1, m2, m3) => ({
            emissions: (parseFloat(stats[`month_${m1}_co2e`] || 0) + parseFloat(stats[`month_${m2}_co2e`] || 0) + parseFloat(stats[`month_${m3}_co2e`] || 0)),
            spend: (parseFloat(stats[`month_${m1}_spend`] || 0) + parseFloat(stats[`month_${m2}_spend`] || 0) + parseFloat(stats[`month_${m3}_spend`] || 0))
        });

        return {
            q1: getQ("01", "02", "03"),
            q2: getQ("04", "05", "06"),
            q3: getQ("07", "08", "09"),
            q4: getQ("10", "11", "12")
        };
    },

    getForecast: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return null;

        let monthsWithData = 0;
        let accumulatedCo2 = 0;

        for (let i = 1; i <= 12; i++) {
            const m = i.toString().padStart(2, '0');
            const val = parseFloat(stats[`month_${m}_co2e`] || 0);
            if (val > 0) { monthsWithData++; accumulatedCo2 += val; }
        }

        const projected = monthsWithData > 0 ? (accumulatedCo2 / monthsWithData) * 12 : 0;

        return {
            currentAccumulated: parseFloat(accumulatedCo2.toFixed(2)),
            monthsProcessed: monthsWithData,
            projectedYearlyTotal: parseFloat(projected.toFixed(2)),
            trend: projected > accumulatedCo2 ? "Increasing" : "Stable"
        };
    },

    getYearOverYear: async (orgId, month, year) => {
        const yearsToCompare = [year.toString(), (year - 1).toString()];
        const [currentStats, prevStats] = await repo.getStatsForYears(orgId, yearsToCompare);

        const mStr = month.toString().padStart(2, '0');

        const current = {
            emissions: parseFloat(currentStats?.[`month_${mStr}_co2e`] || 0),
            spend: parseFloat(currentStats?.[`month_${mStr}_spend`] || 0)
        };

        // Si prevStats es null (porque no existe 2025), inicializamos en cero
        const previous = {
            emissions: parseFloat(prevStats?.[`month_${mStr}_co2e`] || 0),
            spend: parseFloat(prevStats?.[`month_${mStr}_spend`] || 0)
        };

        // Evitamos división por cero si no hay 2025
        const diffE = previous.emissions === 0 ? (current.emissions > 0 ? 100 : 0) : ((current.emissions - previous.emissions) / previous.emissions) * 100;
        const diffS = previous.spend === 0 ? (current.spend > 0 ? 100 : 0) : ((current.spend - previous.spend) / previous.spend) * 100;

        return {
            month,
            currentYear: current,
            previousYear: previous,
            diffPercentageEmissions: parseFloat(diffE.toFixed(2)),
            diffPercentageSpend: parseFloat(diffS.toFixed(2)),
            // Si no hay datos previos, no podemos asegurar una mejora de eficiencia
            efficiencyImprovement: previous.spend > 0 ? (current.emissions / current.spend) < (previous.emissions / previous.spend) : false
        };
    },

    /**
     * 3. EFICIENCIA Y METAS
     */
    getIntensity: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return null;

        const totalCo2 = parseFloat(stats.total_co2e_kg || 0);
        const totalSpend = parseFloat(stats.total_spend || 0);
        const ratio = totalSpend > 0 ? (totalCo2 / totalSpend) : 0;

        return {
            year,
            ratio: parseFloat(ratio.toFixed(4)),
            unit: "kgCO2e / $",
            label: "Intensidad de Carbono"
        };
    },

    getIntensityByService: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return [];

        const services = ['ELEC', 'GAS'];
        const totalCo2 = parseFloat(stats.total_co2e_kg || 0);

        return services.map(srv => {
            const srvCo2 = parseFloat(stats[`service_${srv}_co2e`] || 0);
            const srvSpend = parseFloat(stats[`service_${srv}_spend`] || 0) || (srv === 'ELEC' ? stats.total_spend * 0.6 : stats.total_spend * 0.4);

            return {
                serviceType: srv,
                intensityRatio: srvSpend > 0 ? parseFloat((srvCo2 / srvSpend).toFixed(4)) : 0,
                totalContributionPercentage: totalCo2 > 0 ? parseFloat(((srvCo2 / totalCo2) * 100).toFixed(2)) : 0
            };
        });
    },

    getGoalTracking: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        const goals = await repo.getGoals(orgId, year);

        const accumulated = parseFloat(stats?.total_co2e_kg || 0);
        const target = parseFloat(goals?.annualTargetEmissions || 2000);

        return {
            annualTargetEmissions: target,
            currentAccumulated: accumulated,
            remainingCarbonBudget: parseFloat((target - accumulated).toFixed(2)),
            daysRemainingInYear: 365 - (new Date().getMonth() * 30), // Aproximación
            burnRate: accumulated > 0 ? parseFloat((accumulated / (new Date().getMonth() + 1)).toFixed(2)) : 0,
            isOnTrack: accumulated <= target
        };
    },

    getOffsetEstimation: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        const totalTons = (parseFloat(stats?.total_co2e_kg || 0) / 1000);
        const marketPrice = 25.50; // Precio ficticio por tonelada de CO2

        return {
            totalTonsToOffset: parseFloat(totalTons.toFixed(3)),
            estimatedMarketPrice: marketPrice,
            estimatedCostToNetZero: parseFloat((totalTons * marketPrice).toFixed(2))
        };
    },

    /**
     * 4. GOBERNANZA Y PROVEEDORES
     */
    getAuditQueue: async (orgId, year, month) => {
        const items = await repo.getInvoicesForAudit(orgId, { year, month, onlyRequiresReview: true });
        return items.map(inv => ({
            id: inv.SK,
            vendor: inv.extracted_data?.vendor || "N/A",
            score: inv.ai_analysis?.confidence_score || 0,
            invoiceNumber: inv.extracted_data?.invoice_number || "S/N",
            reason: inv.ai_analysis?.insight_text || "Revisión manual requerida",
            pdfUrl: inv.pdfUrl
        }));
    },

    dataQualitySummary: async (orgId, year, month) => {
        const invoices = await repo.getInvoicesForAudit(orgId, { year, month });
        const total = invoices.length;
        if (total === 0) return { averageConfidence: 0, totalPendingReview: 0, automatedProcessRate: 0 };

        const pending = invoices.filter(i => i.ai_analysis?.requires_review).length;
        const avgConf = invoices.reduce((acc, i) => acc + (i.ai_analysis?.confidence_score || 0), 0) / total;

        return {
            averageConfidence: parseFloat(avgConf.toFixed(2)),
            totalPendingReview: pending,
            automatedProcessRate: parseFloat((((total - pending) / total) * 100).toFixed(2))
        };
    },

    getVendorRanking: async (orgId, year, limit = 5) => {
        const invoices = await repo.getYearlyInvoicesRaw(orgId, year);
        const totalOrgCo2 = invoices.reduce((acc, inv) => acc + (inv.climatiq_result?.co2e || 0), 0);

        const rankingMap = invoices.reduce((acc, inv) => {
            const name = inv.extracted_data?.vendor || "Unknown";
            if (!acc[name]) acc[name] = { vendorName: name, totalCo2e: 0, totalInvoices: 0, conf: 0 };

            acc[name].totalCo2e += (inv.climatiq_result?.co2e || 0);
            acc[name].totalInvoices += 1;
            acc[name].conf += (inv.ai_analysis?.confidence_score || 0);
            return acc;
        }, {});

        return Object.values(rankingMap)
            .map(v => ({
                ...v,
                percentageOfTotalOrgEmissions: totalOrgCo2 > 0 ? parseFloat(((v.totalCo2e / totalOrgCo2) * 100).toFixed(2)) : 0,
                averageConfidence: parseFloat((v.conf / v.totalInvoices).toFixed(2))
            }))
            .sort((a, b) => b.totalCo2e - a.totalCo2e)
            .slice(0, limit);
    },

    searchInvoices: async (orgId, args) => {
        return await repo.searchInvoices(orgId, args);
    }
};