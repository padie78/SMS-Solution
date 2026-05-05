/**
 * IoT Telemetry Explorer — series crudas alineadas a METER#DATE (Single Table Design).
 */

export interface TechnicalConstraints {
  readonly nominal_amps: number;
  readonly trip_amps: number;
  readonly nominal_volts: number;
  readonly low_volts: number;
}

/** Punto de log (METER_LOGS / telemetría agregada). */
export interface MeterLogPoint {
  readonly t: number;
  readonly amps: number;
  readonly volts: number;
  /** 0 = normal, 1 = severidad máxima (visualMap / anomalía). */
  readonly anomaly: number;
}

export interface ForecastOverlayPoint {
  readonly t: number;
  readonly amps: number;
}

export interface TelemetryAsset {
  readonly id: string;
  readonly label: string;
  readonly meterSk: string;
  readonly constraints: TechnicalConstraints;
  readonly points: readonly MeterLogPoint[];
  readonly forecast: readonly ForecastOverlayPoint[];
}

export interface TelemetryExplorerState {
  readonly reliability_score_pct: number;
  readonly samples_per_sec: number;
  readonly ingest_lag_ms: number;
  /** Sparkline KPI — últimos puntos de corriente (demo). */
  readonly sparkline: readonly number[];
  readonly samples_sparkline: readonly number[];
  readonly lag_sparkline: readonly number[];
  readonly assets: readonly TelemetryAsset[];
}
