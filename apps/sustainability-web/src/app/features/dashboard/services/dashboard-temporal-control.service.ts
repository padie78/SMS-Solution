import { Injectable, computed, effect, signal } from '@angular/core';
import type {
  DashboardState,
  ForecastDayPoint,
  RadarHealthDataset,
  SankeyMassBalanceDataset,
  StatsMonthlyAggregate
} from '../../../core/models/global-dashboard.model';
import { MOCK_GLOBAL_DASHBOARD_STATE } from '../data/global-dashboard.mock';
import { GlobalDashboardStateService } from './global-dashboard-state.service';

export type DashboardScale = 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

export interface DashboardContext {
  readonly scale: DashboardScale;
  /** Fecha de referencia del periodo (día elegido, mes elegido, año elegido, etc.). */
  readonly referenceDate: Date;
}

interface PeriodTotals {
  readonly totalKwh: number;
  readonly totalSpendUsd: number;
  readonly totalCo2eKg: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardTemporalControlService {
  private readonly base = MOCK_GLOBAL_DASHBOARD_STATE;

  private readonly _context = signal<DashboardContext>({
    scale: 'MONTH',
    referenceDate: new Date()
  });

  private readonly _isRegenerating = signal(false);
  private readonly _kwhDeltaPct = signal(0);

  readonly context = this._context.asReadonly();
  readonly isRegenerating = this._isRegenerating.asReadonly();
  readonly kwhDeltaPct = this._kwhDeltaPct.asReadonly();

  /** Etiqueta compacta para el header (ej: "May 2026", "05 May 2026"). */
  readonly periodLabel = computed(() => formatContextLabel(this._context()));

  constructor(private readonly dashboardState: GlobalDashboardStateService) {
    effect(
      () => {
        const ctx = this._context();
        void this.regenerateMockState(ctx);
      },
      { allowSignalWrites: true }
    );
  }

  /** Helpers para data ficticia en UI (determinista por contexto). */
  debugSeed(): number {
    return seedFromContext(this._context());
  }

  debugRng(seed: number): () => number {
    return mulberry32(seed >>> 0);
  }

  setScale(scale: DashboardScale): void {
    this._context.update((c) => ({ ...c, scale }));
  }

  setReferenceDate(date: Date): void {
    // Normalizamos a "día" (sin hora) para estabilidad de seed y comparación.
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    this._context.update((c) => ({ ...c, referenceDate: d }));
  }

  /** Utilidad para PeriodNavigator: cambiar solo mes/año preservando día válido. */
  setMonth(monthIndex0: number): void {
    const c = this._context();
    const d = new Date(c.referenceDate);
    d.setMonth(monthIndex0, 1);
    this.setReferenceDate(d);
  }

  setYear(year: number): void {
    const c = this._context();
    const d = new Date(c.referenceDate);
    d.setFullYear(year, d.getMonth(), 1);
    this.setReferenceDate(d);
  }

  /** Para escala trimestral: Q1..Q4. */
  setQuarter(quarterIndex0: number): void {
    const c = this._context();
    const d = new Date(c.referenceDate);
    const q = clamp(0, 3, quarterIndex0);
    const monthStart = q * 3;
    d.setMonth(monthStart, 1);
    this.setReferenceDate(d);
  }

  private async regenerateMockState(ctx: DashboardContext): Promise<void> {
    this._isRegenerating.set(true);
    // Simula pipeline (OCR/ETL) para feedback visual.
    await sleep(260);

    const current = buildPeriodSeries(ctx);
    const previous = buildPeriodSeries(previousContext(ctx));
    const totals = totalsFromSeries(current.values);
    const prevTotals = totalsFromSeries(previous.values);

    const pctVsPrev = percentDelta(totals.totalKwh, prevTotals.totalKwh);
    this._kwhDeltaPct.set(pctVsPrev);

    const nextStats: StatsMonthlyAggregate = {
      ...this.base.stats,
      period_label: formatContextLabel(ctx),
      total_kwh: Math.round(totals.totalKwh),
      budget_kwh: Math.round(totals.totalKwh * 0.97),
      total_spend_usd: Math.round(totals.totalSpendUsd),
      budget_spend_usd: Math.round(totals.totalSpendUsd * 1.02),
      ghg_kg_co2e: Math.round(totals.totalCo2eKg),
      consumption_sparkline_kwh: current.values.map((v) => Math.max(0, Math.round(v)))
    };

    const nextForecast: ForecastDayPoint[] = buildForecastFromSeries(ctx, current.labels, current.values);

    const nextSankey = reweightSankey(this.base.sankey, totals.totalKwh, seedFromContext(ctx));
    const nextRadar = reweightRadar(this.base.radar, pctVsPrev, seedFromContext(ctx));

    const nextState: DashboardState = {
      ...this.base,
      stats: nextStats,
      predictive: {
        ...this.base.predictive,
        // El chart de forecast consume `forecast` completo; lo reorientamos por escala.
        forecast: nextForecast,
        // Hacemos que el drift sea más ruidoso en escalas largas.
        drift_index_pct: clamp(0.6, 9.5, this.base.predictive.drift_index_pct + pctVsPrev / 12)
      },
      sankey: nextSankey,
      radar: nextRadar
    };

    this.dashboardState.setState(nextState);
    this._isRegenerating.set(false);
  }
}

function reweightSankey(base: SankeyMassBalanceDataset, totalKwh: number, seed: number): SankeyMassBalanceDataset {
  const rng = mulberry32(seed ^ 0xa53a9e37);
  const main = base.nodes[0]?.name ?? 'Medidor principal';
  const leafLinks = base.links.filter((l) => l.source === main);
  if (leafLinks.length === 0) return base;

  // Distribuye el total por categoría manteniendo proporciones aproximadas + leve ruido.
  const weights = leafLinks.map((l) => Math.max(0.05, l.value / leafLinks.reduce((s, x) => s + x.value, 0)));
  const noisy = weights.map((w) => Math.max(0.04, w + (rng() - 0.5) * 0.06));
  const sum = noisy.reduce((s, x) => s + x, 0) || 1;
  const norm = noisy.map((x) => x / sum);

  const nextLinks = base.links.map((l) => {
    if (l.source !== main) return l;
    const idx = leafLinks.findIndex((x) => x.target === l.target);
    const share = idx >= 0 ? norm[idx] : 0;
    return { ...l, value: Math.round(totalKwh * share) };
  });

  return { nodes: [...base.nodes], links: nextLinks };
}

function reweightRadar(base: RadarHealthDataset, pctVsPrev: number, seed: number): RadarHealthDataset {
  const rng = mulberry32(seed ^ 0x1b873593);
  // Si sube consumo vs periodo anterior, penaliza CO2e/cumplimiento; si baja, mejora.
  const drift = clamp(-12, 12, pctVsPrev / 2.2);
  const next = base.values.map((v, i) => {
    const jitter = (rng() - 0.5) * 6;
    const bias =
      i === 1 /* Cumplimiento CO2e */ ? -drift :
      i === 3 /* Eficiencia turno */ ? -drift / 2 :
      drift / 3;
    return clamp(10, 98, v + jitter + bias);
  });
  return { indicators: [...base.indicators], values: next.map((x) => Math.round(x)) };
}

function buildPeriodSeries(ctx: DashboardContext): { labels: readonly string[]; values: readonly number[] } {
  const seed = seedFromContext(ctx);
  const rng = mulberry32(seed);

  switch (ctx.scale) {
    case 'DAY': {
      const labels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
      const base = 40 + rng() * 20;
      const values = labels.map((_, h) => {
        const peak = Math.exp(-Math.pow((h - 14) / 5.5, 2));
        const noise = (rng() - 0.5) * 6;
        return Math.max(0, base + 28 * peak + noise);
      });
      return { labels, values };
    }
    case 'WEEK': {
      const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const base = 820 + rng() * 120;
      const values = labels.map((_, i) => {
        const weekendPenalty = i >= 5 ? -120 : 0;
        const noise = (rng() - 0.5) * 90;
        return Math.max(0, base + weekendPenalty + noise);
      });
      return { labels, values };
    }
    case 'MONTH': {
      const y = ctx.referenceDate.getFullYear();
      const m = ctx.referenceDate.getMonth();
      const days = daysInMonth(y, m);
      const labels = Array.from({ length: days }, (_, d) => String(d + 1).padStart(2, '0'));
      const base = 780 + rng() * 140;
      const values = labels.map((_, i) => {
        const season = 90 * Math.sin(((i + 1) / days) * Math.PI * 2);
        const noise = (rng() - 0.5) * 140;
        return Math.max(0, base + season + noise);
      });
      return { labels, values };
    }
    case 'QUARTER': {
      const y = ctx.referenceDate.getFullYear();
      const q = Math.floor(ctx.referenceDate.getMonth() / 3); // 0..3
      const startMonth = q * 3;
      const labels: string[] = [];
      for (let i = 0; i < 3; i += 1) {
        const d = new Date(y, startMonth + i, 1);
        const m = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d);
        labels.push(m[0]?.toUpperCase() + m.slice(1));
      }
      const base = 66000 + rng() * 8200;
      const values = labels.map((_, i) => {
        const seasonal = 4200 * Math.sin(((i + 1) / 3) * Math.PI * 2);
        const noise = (rng() - 0.5) * 5200;
        return Math.max(0, base / 3 + seasonal + noise);
      });
      return { labels, values };
    }
    case 'YEAR': {
      const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const base = 22000 + rng() * 3200;
      const values = labels.map((_, i) => {
        const seasonal = 5200 * Math.sin(((i + 1) / 12) * Math.PI * 2);
        const noise = (rng() - 0.5) * 2400;
        return Math.max(0, base + seasonal + noise);
      });
      return { labels, values };
    }
  }
}

function buildForecastFromSeries(
  ctx: DashboardContext,
  labels: readonly string[],
  values: readonly number[]
): ForecastDayPoint[] {
  const seed = seedFromContext(ctx) ^ 0x9e3779b9;
  const rng = mulberry32(seed);

  const cum: number[] = [];
  let acc = 0;
  for (const v of values) {
    acc += v;
    cum.push(acc);
  }

  // Banda de confianza: más estrecha en día, más amplia en año.
  const widthPct =
    ctx.scale === 'DAY'
      ? 0.04
      : ctx.scale === 'WEEK'
        ? 0.06
        : ctx.scale === 'MONTH'
          ? 0.09
          : ctx.scale === 'QUARTER'
            ? 0.11
            : 0.14;

  return labels.map((label, i) => {
    const base = cum[i] ?? 0;
    const jitter = (rng() - 0.5) * base * 0.01;
    const mid = Math.max(0, base + jitter);
    const half = Math.max(0.01, mid * widthPct);
    return {
      day_index: i,
      day_label: label,
      cumulative_actual_kwh: mid,
      p10_kwh: Math.max(0, mid - half),
      p50_kwh: mid,
      p90_kwh: mid + half
    };
  });
}

function previousContext(ctx: DashboardContext): DashboardContext {
  const d = new Date(ctx.referenceDate);
  switch (ctx.scale) {
    case 'DAY':
      d.setDate(d.getDate() - 1);
      break;
    case 'WEEK':
      d.setDate(d.getDate() - 7);
      break;
    case 'MONTH':
      d.setMonth(d.getMonth() - 1, 1);
      break;
    case 'QUARTER':
      d.setMonth(d.getMonth() - 3, 1);
      break;
    case 'YEAR':
      d.setFullYear(d.getFullYear() - 1, 0, 1);
      break;
  }
  d.setHours(0, 0, 0, 0);
  return { ...ctx, referenceDate: d };
}

function totalsFromSeries(values: readonly number[]): PeriodTotals {
  const totalKwh = values.reduce((a, v) => a + v, 0);
  const totalSpendUsd = totalKwh * 0.19;
  const totalCo2eKg = totalKwh * 0.00028;
  return { totalKwh, totalSpendUsd, totalCo2eKg };
}

function percentDelta(current: number, prev: number): number {
  if (!isFinite(current) || !isFinite(prev) || prev === 0) return 0;
  return ((current - prev) / prev) * 100;
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function seedFromContext(ctx: DashboardContext): number {
  const d = ctx.referenceDate;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const scale =
    ctx.scale === 'DAY'
      ? 1
      : ctx.scale === 'WEEK'
        ? 2
        : ctx.scale === 'MONTH'
          ? 3
          : ctx.scale === 'QUARTER'
            ? 4
            : 5;
  // Combina y evita overflow con bit ops.
  return ((y * 10000 + m * 100 + day) ^ (scale * 2654435761)) >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function formatContextLabel(ctx: DashboardContext): string {
  const d = ctx.referenceDate;
  const locale = 'es-ES';
  switch (ctx.scale) {
    case 'DAY':
      return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
    case 'WEEK': {
      const end = new Date(d);
      end.setDate(d.getDate() + 6);
      const a = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(d);
      const b = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(end);
      return `${a} – ${b}`;
    }
    case 'MONTH':
      return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(d);
    case 'QUARTER': {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return `T${q} ${d.getFullYear()}`;
    }
    case 'YEAR':
      return String(d.getFullYear());
  }
}

