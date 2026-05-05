import type { EChartsOption } from 'echarts';
import type { DashboardState } from '../../../core/models/global-dashboard.model';
import type { DashboardScale } from '../services/dashboard-temporal-control.service';

/** Tema claro alineado a jerarquía / ubicaciones (slate + emerald). */
const TEXT = '#64748b';
const GRID = '#e2e8f0';
const AXIS = '#cbd5e1';
const EMERALD = '#059669';
const AMBER = '#d97706';
const ZINC_BG = 'transparent';
const TOOLTIP_BG = 'rgba(255,255,255,0.98)';
const TOOLTIP_BORDER = '#e2e8f0';
const TOOLTIP_TEXT = '#334155';

const AXIS_LABEL = {
  color: TEXT,
  fontSize: 10,
  hideOverlap: true
} as const;

const Y_LABEL = {
  color: TEXT,
  fontSize: 10
} as const;

const GRID_COMPACT = {
  left: 56,
  right: 22,
  top: 20,
  bottom: 34,
  containLabel: true
} as const;

function formatUsd(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    n
  );
}

export function buildForecastChartOption(state: DashboardState): EChartsOption {
  const fc = state.predictive.forecast;
  const labels = fc.map((p) => p.day_label);
  const actual = fc.map((p) => p.cumulative_actual_kwh ?? null);
  const p50 = fc.map((p) => p.p50_kwh);
  const p10 = fc.map((p) => p.p10_kwh);
  const p90 = fc.map((p) => p.p90_kwh);
  const bandBase = fc.map((p) => p.cumulative_actual_kwh ?? p.p10_kwh);
  const bandHeight = fc.map((p) => {
    const lo = p.cumulative_actual_kwh ?? p.p10_kwh;
    const hi = p.cumulative_actual_kwh ?? p.p90_kwh;
    return Math.max(0, hi - lo);
  });
  const procrastination = state.predictive.procrastination_cost_usd_weekly;

  return {
    backgroundColor: ZINC_BG,
    textStyle: { color: TEXT },
    animationDuration: 450,
    // La leyenda ya se renderiza fuera del canvas (component template).
    // Con alturas compactas, la leyenda interna termina tapando el plot.
    grid: { ...GRID_COMPACT, right: 24, top: 18 },
    legend: { show: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: AXIS } },
      backgroundColor: TOOLTIP_BG,
      borderColor: TOOLTIP_BORDER,
      textStyle: { color: TOOLTIP_TEXT, fontSize: 11 },
      formatter: (params: unknown) => {
        const raw = (Array.isArray(params) ? params : [params]) as {
          axisValueLabel?: string;
          seriesName?: string;
          marker?: string;
          value?: number | null;
          dataIndex?: number;
        }[];
        const head = raw[0];
        const idx = typeof head?.dataIndex === 'number' ? head.dataIndex : 0;
        const day = head?.axisValueLabel ?? '';
        const touchesBand = raw.some(
          (x) => x.seriesName === 'Banda P10–P90' || x.seriesName === 'P50'
        );
        let html = `<div style="font-weight:600;margin-bottom:4px">${day}</div>`;
        for (const x of raw) {
          if (x.seriesName === '__band_base' || x.seriesName === 'Banda P10–P90') continue;
          const v = x.value;
          if (v === null || v === undefined) continue;
          html += `<div>${x.marker ?? ''} ${x.seriesName}: <b>${typeof v === 'number' ? v.toLocaleString('es-ES') : String(v)}</b> kWh</div>`;
        }
        /* D1..D18 real; proyección desde D19 (índice 18). */
        const isForecastHorizon = idx >= 18;
        if (touchesBand && isForecastHorizon) {
          html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid ${TOOLTIP_BORDER};color:${AMBER};font-size:11px">`;
          html += `<div style="font-weight:700;margin-bottom:2px">Costo de procrastinación (ref.)</div>`;
          html += `<div>Σ ahorros no ejecutados (semana): <b>${formatUsd(procrastination)}</b></div>`;
          html += `<div style="opacity:.85;margin-top:2px">Pregunta de negocio #18 — ai_analysis.pending</div>`;
          html += `</div>`;
        }
        return html;
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: {
        ...AXIS_LABEL,
        interval: 'auto',
        formatter: (v: string) => (typeof v === 'string' && v.length > 6 ? `${v.slice(0, 6)}…` : v)
      }
    },
    yAxis: {
      type: 'value',
      name: 'kWh acum.',
      nameTextStyle: { color: TEXT },
      splitLine: { lineStyle: { color: GRID } },
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: Y_LABEL
    },
    series: [
      {
        name: '__band_base',
        type: 'line',
        stack: 'band',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        data: bandBase,
        tooltip: { show: false }
      },
      {
        name: 'Banda P10–P90',
        type: 'line',
        stack: 'band',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(5,150,105,0.12)' },
        data: bandHeight,
        emphasis: { focus: 'series' }
      },
      {
        name: 'Acumulado real',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: actual,
        lineStyle: { width: 2, color: '#475569' },
        connectNulls: false
      },
      {
        name: 'P50',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: p50,
        lineStyle: { width: 2, type: 'dashed', color: EMERALD }
      }
    ]
  } as EChartsOption;
}

export function buildSankeyChartOption(state: DashboardState): EChartsOption {
  const { nodes, links } = state.sankey;
  return {
    backgroundColor: ZINC_BG,
    textStyle: { color: TEXT },
    tooltip: {
      trigger: 'item',
      backgroundColor: TOOLTIP_BG,
      borderColor: TOOLTIP_BORDER,
      textStyle: { color: TOOLTIP_TEXT }
    },
    series: [
      {
        type: 'sankey',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'justify',
        data: [...nodes],
        links: [...links],
        top: 8,
        bottom: 8,
        left: 8,
        right: 8,
        lineStyle: { color: 'source', curveness: 0.5, opacity: 0.55 },
        label: { color: TEXT, fontSize: 11 },
        itemStyle: { borderWidth: 0 }
      }
    ]
  } as EChartsOption;
}

export function buildRadarChartOption(state: DashboardState): EChartsOption {
  const { indicators, values } = state.radar;
  return {
    backgroundColor: ZINC_BG,
    textStyle: { color: TEXT },
    tooltip: {
      backgroundColor: TOOLTIP_BG,
      borderColor: TOOLTIP_BORDER,
      textStyle: { color: TOOLTIP_TEXT }
    },
    radar: {
      center: ['50%', '55%'],
      radius: '70%',
      indicator: indicators.map((i) => ({ name: i.name, max: i.max })),
      splitLine: { lineStyle: { color: GRID } },
      splitArea: {
        show: true,
        areaStyle: { color: ['rgba(248,250,252,0.95)', 'rgba(241,245,249,0.9)'] }
      },
      axisLine: { lineStyle: { color: AXIS } },
      axisName: { color: TEXT, fontSize: 11 }
    },
    series: [
      {
        type: 'radar',
        symbolSize: 6,
        areaStyle: { color: 'rgba(5,150,105,0.15)' },
        lineStyle: { width: 2, color: EMERALD },
        data: [{ value: [...values], name: 'Health score' }]
      }
    ]
  } as EChartsOption;
}

export function buildBenchmarkSitesOption(args: {
  readonly scale: DashboardScale;
  readonly labels: readonly string[];
  readonly siteValues: readonly { site: string; kwhPerM2: number }[];
}): EChartsOption {
  const { scale, labels, siteValues } = args;
  const xs = siteValues.map((s) => s.site);
  const ys = siteValues.map((s) => s.kwhPerM2);
  return {
    backgroundColor: ZINC_BG,
    textStyle: { color: TEXT },
    animationDuration: 450,
    grid: GRID_COMPACT,
    tooltip: {
      trigger: 'axis',
      backgroundColor: TOOLTIP_BG,
      borderColor: TOOLTIP_BORDER,
      textStyle: { color: TOOLTIP_TEXT, fontSize: 11 }
    },
    xAxis: {
      type: 'category',
      data: xs,
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: {
        ...AXIS_LABEL,
        interval: 0,
        formatter: (v: string) => (typeof v === 'string' && v.length > 10 ? `${v.slice(0, 10)}…` : v)
      }
    },
    yAxis: {
      type: 'value',
      name: `kWh/m² (${scaleLabel(scale, labels)})`,
      nameTextStyle: { color: TEXT },
      splitLine: { lineStyle: { color: GRID } },
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: Y_LABEL
    },
    series: [
      {
        name: 'Intensidad energética',
        type: 'bar',
        data: ys,
        itemStyle: { color: EMERALD, borderRadius: [10, 10, 0, 0] }
      }
    ]
  } as EChartsOption;
}

export function buildActiveIdleOption(args: {
  readonly labels: readonly string[];
  readonly activeKwh: readonly number[];
  readonly idleKwh: readonly number[];
}): EChartsOption {
  const { labels, activeKwh, idleKwh } = args;
  return {
    backgroundColor: ZINC_BG,
    textStyle: { color: TEXT },
    animationDuration: 450,
    grid: GRID_COMPACT,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: TOOLTIP_BG,
      borderColor: TOOLTIP_BORDER,
      textStyle: { color: TOOLTIP_TEXT, fontSize: 11 }
    },
    // Sin leyenda interna (evita solapes en cards compactas).
    legend: { show: false },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: { ...AXIS_LABEL, interval: 'auto' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: GRID } },
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: Y_LABEL
    },
    series: [
      {
        name: 'ACTIVE (productiva)',
        type: 'bar',
        stack: 'kwh',
        data: activeKwh,
        // En stack: el segmento inferior NO debe tener borde superior redondeado,
        // si no aparece una “línea”/hueco entre ACTIVE e IDLE.
        itemStyle: { color: EMERALD, borderRadius: [0, 0, 0, 0] }
      },
      {
        name: 'IDLE (ociosa)',
        type: 'bar',
        stack: 'kwh',
        data: idleKwh,
        itemStyle: { color: 'rgba(100,116,139,0.85)', borderRadius: [10, 10, 0, 0] }
      }
    ]
  } as EChartsOption;
}

export function buildPhantomConsumptionOption(args: {
  readonly labels: readonly string[];
  readonly phantomKwh: readonly number[];
}): EChartsOption {
  const { labels, phantomKwh } = args;
  return {
    backgroundColor: ZINC_BG,
    textStyle: { color: TEXT },
    animationDuration: 450,
    grid: GRID_COMPACT,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: AXIS } },
      backgroundColor: TOOLTIP_BG,
      borderColor: TOOLTIP_BORDER,
      textStyle: { color: TOOLTIP_TEXT, fontSize: 11 }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: { ...AXIS_LABEL, interval: 'auto' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: GRID } },
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: Y_LABEL
    },
    series: [
      {
        name: 'Consumo fantasma',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: phantomKwh,
        lineStyle: { width: 2, color: AMBER },
        areaStyle: { color: 'rgba(217,119,6,0.12)' }
      }
    ]
  } as EChartsOption;
}

export function buildReliabilityTrendOption(args: {
  readonly labels: readonly string[];
  readonly reliabilityPct: readonly number[];
}): EChartsOption {
  const { labels, reliabilityPct } = args;
  return {
    backgroundColor: ZINC_BG,
    textStyle: { color: TEXT },
    animationDuration: 450,
    grid: GRID_COMPACT,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: AXIS } },
      backgroundColor: TOOLTIP_BG,
      borderColor: TOOLTIP_BORDER,
      textStyle: { color: TOOLTIP_TEXT, fontSize: 11 },
      formatter: (params: unknown) => {
        const raw = (Array.isArray(params) ? params : [params]) as { axisValueLabel?: string; value?: number }[];
        const label = raw[0]?.axisValueLabel ?? '';
        const v = raw[0]?.value ?? 0;
        return `<div style="font-weight:600;margin-bottom:4px">${label}</div><div><b>${v}%</b> reliability</div>`;
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: { ...AXIS_LABEL, interval: 'auto' }
    },
    yAxis: {
      type: 'value',
      min: 85,
      max: 100,
      splitLine: { lineStyle: { color: GRID } },
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: { ...Y_LABEL, formatter: '{value}%' }
    },
    series: [
      {
        name: 'Reliability',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: reliabilityPct,
        lineStyle: { width: 2, color: '#0f766e' },
        areaStyle: { color: 'rgba(15,118,110,0.12)' }
      }
    ]
  } as EChartsOption;
}

function scaleLabel(scale: DashboardScale, labels: readonly string[]): string {
  switch (scale) {
    case 'DAY':
      return 'día';
    case 'WEEK':
      return 'semana';
    case 'MONTH':
      return 'mes';
    case 'QUARTER':
      return 'trimestre';
    case 'YEAR':
      return labels.length ? 'año' : 'año';
  }
}
