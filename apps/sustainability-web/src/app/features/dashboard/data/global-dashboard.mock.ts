import type {
  AiAnalysisRecord,
  DashboardState,
  ForecastDayPoint,
  SankeyMassBalanceDataset,
  StatsMonthlyAggregate
} from '../../../core/models/global-dashboard.model';

function buildSparkline(): number[] {
  const base = 11800;
  const out: number[] = [];
  for (let i = 0; i < 30; i += 1) {
    const noise = Math.sin(i / 2.3) * 420 + (i % 5) * 80;
    out.push(Math.round(base + noise + i * 35));
  }
  return out;
}

/** 30 días: acumulado real hasta D18; desde D19 banda P10–P90 ancha para visualización. */
function buildForecast(): ForecastDayPoint[] {
  const todayIdx = 18;
  const points: ForecastDayPoint[] = [];
  let cumAtCloseOfReal = 0;
  for (let d = 1; d <= 30; d += 1) {
    const daily = 4200 + (d % 7) * 140 + (d % 3) * 90;
    const label = `D${String(d).padStart(2, '0')}`;
    if (d <= todayIdx) {
      cumAtCloseOfReal += daily;
      points.push({
        day_index: d,
        day_label: label,
        cumulative_actual_kwh: cumAtCloseOfReal,
        p10_kwh: cumAtCloseOfReal,
        p50_kwh: cumAtCloseOfReal,
        p90_kwh: cumAtCloseOfReal
      });
    } else {
      const k = d - todayIdx;
      const cum0 = cumAtCloseOfReal;
      const p50 = cum0 + k * 4100 + k * k * 12;
      const p10 = p50 - k * 620 - k * k * 8;
      const p90 = p50 + k * 780 + k * k * 15;
      points.push({
        day_index: d,
        day_label: label,
        cumulative_actual_kwh: null,
        p10_kwh: Math.round(p10),
        p50_kwh: Math.round(p50),
        p90_kwh: Math.round(p90)
      });
    }
  }
  return points;
}

const STATS: StatsMonthlyAggregate = {
  tenant_id: 'ORG#demo',
  sk: 'STATS#MONTHLY',
  period_label: '2026-05',
  reliability_score_pct: 97.2,
  total_kwh: 128_400,
  budget_kwh: 132_000,
  total_spend_usd: 41_200,
  budget_spend_usd: 42_800,
  ghg_kg_co2e: 54_200,
  floor_area_m2: 38_500,
  consumption_sparkline_kwh: buildSparkline()
};

const AI_ACTIONS: readonly AiAnalysisRecord[] = [
  {
    recommendation_id: 'AI#tariff-shift',
    title: 'Optimización tarifaria (TOU)',
    description:
      'Desplazar 8% de carga HVAC a ventana valle sin afectar confort modelado; reduce pico contractual.',
    roi_eur: 128_000,
    ghg_reduction_kg_co2e: 420,
    implementation_effort: 'MEDIUM',
    status: 'PENDING',
    procrastination_cost_usd_if_delayed_week: 3_400
  },
  {
    recommendation_id: 'AI#phase-rebalance',
    title: 'Rebalanceo de fases — Tablero LV-2',
    description:
      'Corriente de fase B +12% vs A/C; rebalanceo reduce pérdidas y THD percibido en derivación.',
    roi_eur: 62_500,
    ghg_reduction_kg_co2e: 180,
    implementation_effort: 'LOW',
    status: 'PENDING',
    procrastination_cost_usd_if_delayed_week: 1_150
  },
  {
    recommendation_id: 'AI#vfd-air',
    title: 'Perfil VFD compresores de aire',
    description:
      'Curva presión-débito subóptima en fin de semana; ajuste envelope ahorra energía ociosa.',
    roi_eur: 214_000,
    ghg_reduction_kg_co2e: 890,
    implementation_effort: 'HIGH',
    status: 'PENDING',
    procrastination_cost_usd_if_delayed_week: 6_200
  }
];

/** Ficticio: kWh mensual agregado por rama (balance padre → hijos + fugas). */
const SANKEY: SankeyMassBalanceDataset = {
  nodes: [
    { name: 'Medidor principal' },
    { name: 'HVAC' },
    { name: 'Iluminación' },
    { name: 'Proceso / líneas' },
    { name: 'Compresores' },
    { name: 'Pérdidas / fugas' }
  ],
  links: [
    { source: 'Medidor principal', target: 'HVAC', value: 52_000 },
    { source: 'Medidor principal', target: 'Iluminación', value: 19_000 },
    { source: 'Medidor principal', target: 'Proceso / líneas', value: 33_000 },
    { source: 'Medidor principal', target: 'Compresores', value: 14_500 },
    { source: 'Medidor principal', target: 'Pérdidas / fugas', value: 11_500 }
  ]
};

export const MOCK_GLOBAL_DASHBOARD_STATE: DashboardState = {
  stats: STATS,
  predictive: {
    sk: 'PREDICTIVE#MONTH',
    drift_index_pct: 2.1,
    budget_exceed_probability: 0.34,
    forecast: buildForecast(),
    procrastination_cost_usd_weekly: AI_ACTIONS.reduce(
      (s, a) => s + a.procrastination_cost_usd_if_delayed_week,
      0
    )
  },
  ai_actions: AI_ACTIONS,
  sankey: SANKEY,
  radar: {
    indicators: [
      { name: 'Armónicos (THD)', max: 100 },
      { name: 'Cumplimiento CO₂e', max: 100 },
      { name: 'RUL activos', max: 100 },
      { name: 'Eficiencia turno', max: 100 }
    ],
    values: [58, 76, 49, 88]
  }
};
