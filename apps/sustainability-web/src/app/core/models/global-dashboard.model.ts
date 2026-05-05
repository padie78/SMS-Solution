/**
 * Global ESG & Operations Dashboard — vista agregada alineada a Single Table Design (STATS, predictive_engine, ai_analysis).
 * Referencia negocio: docs/business-questions.md (capas Descriptiva / Predictiva / Prescriptiva).
 */

export type AiAnalysisStatus = 'PENDING' | 'EXECUTED' | 'DISMISSED';

export type ImplementationEffort = 'LOW' | 'MEDIUM' | 'HIGH';

/** Agregado tipo STATS#MONTHLY (capa descriptiva). */
export interface StatsMonthlyAggregate {
  readonly tenant_id: string;
  readonly sk: 'STATS#MONTHLY';
  readonly period_label: string;
  readonly reliability_score_pct: number;
  readonly total_kwh: number;
  readonly budget_kwh: number;
  readonly total_spend_usd: number;
  readonly budget_spend_usd: number;
  readonly ghg_kg_co2e: number;
  readonly floor_area_m2: number;
  /** Serie 30d para sparkline de consumo (kWh/día). */
  readonly consumption_sparkline_kwh: readonly number[];
}

export interface ForecastDayPoint {
  readonly day_index: number;
  readonly day_label: string;
  readonly cumulative_actual_kwh: number | null;
  readonly p10_kwh: number;
  readonly p50_kwh: number;
  readonly p90_kwh: number;
}

/** predictive_engine — pronóstico cierre mensual + drift / Monte Carlo resumido. */
export interface PredictiveEngineSnapshot {
  readonly sk: 'PREDICTIVE#MONTH';
  readonly drift_index_pct: number;
  readonly budget_exceed_probability: number;
  readonly forecast: readonly ForecastDayPoint[];
  /**
   * Costo de procrastinación de referencia (pregunta 18) — mostrado en tooltip de bandas / forecast.
   */
  readonly procrastination_cost_usd_weekly: number;
}

export interface AiAnalysisRecord {
  readonly recommendation_id: string;
  readonly title: string;
  readonly description: string;
  readonly roi_eur: number;
  readonly ghg_reduction_kg_co2e: number;
  readonly implementation_effort: ImplementationEffort;
  readonly status: AiAnalysisStatus;
  readonly procrastination_cost_usd_if_delayed_week: number;
}

export interface SankeyMassBalanceNode {
  readonly name: string;
}

export interface SankeyMassBalanceLink {
  readonly source: string;
  readonly target: string;
  readonly value: number;
}

export interface SankeyMassBalanceDataset {
  readonly nodes: readonly SankeyMassBalanceNode[];
  readonly links: readonly SankeyMassBalanceLink[];
}

export interface RadarHealthDataset {
  readonly indicators: readonly { name: string; max: number }[];
  readonly values: readonly number[];
}

export interface DashboardState {
  readonly stats: StatsMonthlyAggregate;
  readonly predictive: PredictiveEngineSnapshot;
  readonly ai_actions: readonly AiAnalysisRecord[];
  readonly sankey: SankeyMassBalanceDataset;
  readonly radar: RadarHealthDataset;
}
