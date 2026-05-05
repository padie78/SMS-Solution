/**
 * Incident Center — operational faults & climate exceedances (SMS).
 * Aligns with descriptive/prescriptive visibility (consumption vs baseline, CO₂e).
 */

export type IncidentDomain = 'energy' | 'water' | 'assets' | 'compliance';

export type IncidentKind = 'operational' | 'climate';

/** Maps to PrimeNG p-tag severities. */
export type IncidentSeverity = 'danger' | 'warning' | 'info';

export type IncidentOrbState = 'live' | 'acknowledged' | 'stable';

export type TrendDirection = 'up' | 'down';

/** Up = worse / higher impact; down = improvement vs baseline. */
export type TrendSemantic = 'adverse' | 'favorable';

/** PrimeNG vertical timeline item (minimal contract for p-timeline). */
export interface IncidentTimelineItem {
  readonly status: string;
  readonly date: string;
  readonly icon: string;
  readonly color: string;
}

export interface IncidentRecord {
  readonly id: string;
  readonly domain: IncidentDomain;
  readonly kind: IncidentKind;
  readonly severity: IncidentSeverity;
  readonly orbState: IncidentOrbState;
  readonly locationPath: string;
  readonly title: string;
  readonly description: string;
  readonly assetLabel: string;
  readonly inactiveCostUsd: number;
  readonly inactiveCarbonKgCo2e: number;
  readonly trendPercent: number;
  readonly trendDirection: TrendDirection;
  readonly trendSemantic: TrendSemantic;
  readonly timeline: readonly IncidentTimelineItem[];
  readonly chartLabels: readonly string[];
  readonly chartBaselineKwh: readonly number[];
  readonly chartActualKwh: readonly number[];
}
