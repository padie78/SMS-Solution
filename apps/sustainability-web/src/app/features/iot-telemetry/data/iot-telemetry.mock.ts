import type {
  ForecastOverlayPoint,
  MeterLogPoint,
  TechnicalConstraints,
  TelemetryAsset,
  TelemetryExplorerState
} from '../../../core/models/iot-telemetry.model';

const STEP_MS = 60_000;
const HISTORY_POINTS = 360;

function buildSeries(seed: number, constraints: TelemetryAsset['constraints']): MeterLogPoint[] {
  const out: MeterLogPoint[] = [];
  const now = Date.now();
  const start = now - HISTORY_POINTS * STEP_MS;
  for (let i = 0; i < HISTORY_POINTS; i += 1) {
    const t = start + i * STEP_MS;
    const wave = Math.sin((i + seed) / 18) * 28 + Math.cos((i + seed) / 7) * 12;
    let amps = constraints.nominal_amps + wave + (i % 97 === 0 ? 95 : 0) + (i % 211 === 0 ? -40 : 0);
    amps = Math.max(120, Math.min(amps, constraints.trip_amps + 40));
    const volts =
      constraints.nominal_volts +
      Math.sin((i + seed * 2) / 25) * 6 +
      (amps > constraints.trip_amps * 0.92 ? -9 : 0);
    const over = amps >= constraints.trip_amps * 0.88 ? (amps - constraints.nominal_amps) / (constraints.trip_amps - constraints.nominal_amps) : 0;
    const anomaly = Math.min(1, Math.max(0, over));
    out.push({ t, amps, volts, anomaly });
  }
  return out;
}

function buildForecast(last: MeterLogPoint, minutes: number): ForecastOverlayPoint[] {
  const out: ForecastOverlayPoint[] = [{ t: last.t, amps: last.amps }];
  const slope = (Math.sin(last.t / 1e8) * 0.4 + 0.15) * 0.35;
  for (let m = 1; m <= minutes; m += 1) {
    const t = last.t + m * STEP_MS;
    const amps = last.amps + slope * m + (m % 11) * 0.8;
    out.push({ t, amps });
  }
  return out;
}

const C1 = {
  nominal_amps: 400,
  trip_amps: 520,
  nominal_volts: 400,
  low_volts: 360
} as const;

const C2 = {
  nominal_amps: 180,
  trip_amps: 260,
  nominal_volts: 230,
  low_volts: 200
} as const;

const C3 = {
  nominal_amps: 95,
  trip_amps: 140,
  nominal_volts: 48,
  low_volts: 42
} as const;

function asset(id: string, label: string, sk: string, c: TechnicalConstraints, seed: number): TelemetryAsset {
  const points = buildSeries(seed, c);
  const last = points[points.length - 1]!;
  return {
    id,
    label,
    meterSk: sk,
    constraints: { ...c },
    points,
    forecast: buildForecast(last, 60)
  };
}

const ASSETS: readonly TelemetryAsset[] = [
  asset('METER#LV-MAIN-A', 'LV Principal — Fase A', 'METER#2026-05-04T00:00:00Z', C1, 3),
  asset('METER#HVAC-CH1', 'HVAC Chiller circuito 1', 'METER#2026-05-04T00:00:00Z', C2, 11),
  asset('METER#DC-BUS', 'DC bus — IT rack', 'METER#2026-05-04T00:00:00Z', C3, 19)
];

function buildSparkline(): number[] {
  return ASSETS[0]!.points.slice(-30).map((p) => p.amps);
}

function sineSpark(n: number, base: number, amp: number): number[] {
  return Array.from({ length: n }, (_, i) => base + Math.sin(i / 3) * amp + (i % 5) * 0.02);
}

export const MOCK_TELEMETRY_EXPLORER_STATE: TelemetryExplorerState = {
  reliability_score_pct: 98.4,
  samples_per_sec: 12.5,
  ingest_lag_ms: 42,
  sparkline: buildSparkline(),
  samples_sparkline: sineSpark(30, 12.5, 0.8),
  lag_sparkline: sineSpark(30, 42, 6),
  assets: ASSETS
};
