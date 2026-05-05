import type { IncidentRecord } from '../../../core/models/incident-center.model';

export const INCIDENT_CENTER_SAMPLE_DATA: readonly IncidentRecord[] = [
  {
    id: 'INC-2026-0142',
    domain: 'energy',
    kind: 'operational',
    severity: 'danger',
    orbState: 'live',
    locationPath: 'Plant A > Electrical > Main LV',
    title: 'Transformer T1 harmonic envelope breach',
    description:
      'THD-V sustained above 8% for 45 min; correlates with VFD bank ramp on Line 3. Risk of utility PF penalties.',
    assetLabel: 'TX-T1-MAIN',
    inactiveCostUsd: 12840,
    inactiveCarbonKgCo2e: 3120,
    trendPercent: 18.4,
    trendDirection: 'up',
    trendSemantic: 'adverse',
    timeline: [
      {
        status: 'Detection',
        date: '2026-05-04 06:12 UTC',
        icon: 'pi pi-bolt',
        color: '#ef4444'
      },
      {
        status: 'Rule correlation',
        date: '2026-05-04 06:14 UTC',
        icon: 'pi pi-sitemap',
        color: '#2563eb'
      },
      {
        status: 'Assignment pending',
        date: '2026-05-04 06:18 UTC',
        icon: 'pi pi-user',
        color: '#64748b'
      }
    ],
    chartLabels: ['D-3', 'D-2', 'D-1', 'D0'],
    chartBaselineKwh: [11800, 12100, 11950, 12020],
    chartActualKwh: [11920, 12280, 13100, 14210]
  },
  {
    id: 'INC-2026-0098',
    domain: 'energy',
    kind: 'climate',
    severity: 'warning',
    orbState: 'live',
    locationPath: 'Plant B > Scope 2 > Grid mix',
    title: 'Scope 2 emissions run-rate above monthly cap',
    description:
      'Trailing 7d intensity 12% above GHG budget; grid factor unchanged — load shift from HVAC night setback failure suspected.',
    assetLabel: 'SITE-B-GRID',
    inactiveCostUsd: 4200,
    inactiveCarbonKgCo2e: 8900,
    trendPercent: 12.1,
    trendDirection: 'up',
    trendSemantic: 'adverse',
    timeline: [
      {
        status: 'Budget threshold crossed',
        date: '2026-05-03 22:40 UTC',
        icon: 'pi pi-chart-line',
        color: '#f59e0b'
      },
      {
        status: 'Factor lock verified',
        date: '2026-05-03 22:55 UTC',
        icon: 'pi pi-lock',
        color: '#2563eb'
      },
      {
        status: 'Assigned — ESG analyst',
        date: '2026-05-04 01:10 UTC',
        icon: 'pi pi-check',
        color: '#22c55e'
      }
    ],
    chartLabels: ['W1', 'W2', 'W3', 'W4'],
    chartBaselineKwh: [210000, 208000, 209500, 210200],
    chartActualKwh: [218000, 221000, 232000, 235500]
  },
  {
    id: 'INC-2026-0201',
    domain: 'water',
    kind: 'operational',
    severity: 'info',
    orbState: 'stable',
    locationPath: 'Campus North > HVAC > Cooling tower CT-2',
    title: 'Make-up water flow anomaly (low confidence)',
    description:
      'Night-time make-up 22% over model; possible drift on mag meter B — cross-check with blowdown counter tomorrow.',
    assetLabel: 'CT-2-FLOW-B',
    inactiveCostUsd: 890,
    inactiveCarbonKgCo2e: 210,
    trendPercent: 4.2,
    trendDirection: 'up',
    trendSemantic: 'adverse',
    timeline: [
      {
        status: 'Model deviation',
        date: '2026-05-02 03:15 UTC',
        icon: 'pi pi-tint',
        color: '#0ea5e9'
      },
      {
        status: 'Sensor QA queued',
        date: '2026-05-02 08:00 UTC',
        icon: 'pi pi-cog',
        color: '#64748b'
      }
    ],
    chartLabels: ['N1', 'N2', 'N3', 'N4', 'N5'],
    chartBaselineKwh: [42, 44, 43, 45, 44],
    chartActualKwh: [44, 46, 48, 51, 53]
  },
  {
    id: 'INC-2026-0077',
    domain: 'assets',
    kind: 'operational',
    severity: 'warning',
    orbState: 'acknowledged',
    locationPath: 'Plant A > Line 3 > Compressor C301',
    title: 'Specific energy deviation on C301',
    description:
      'kWh per Nm³ 9% above 90d baseline while output stable — mechanical or controls issue before next PM window.',
    assetLabel: 'C301',
    inactiveCostUsd: 5600,
    inactiveCarbonKgCo2e: 1340,
    trendPercent: 6.8,
    trendDirection: 'down',
    trendSemantic: 'favorable',
    timeline: [
      {
        status: 'Baseline breach',
        date: '2026-05-01 14:22 UTC',
        icon: 'pi pi-exclamation-triangle',
        color: '#f59e0b'
      },
      {
        status: 'Acknowledged — maintenance',
        date: '2026-05-01 15:05 UTC',
        icon: 'pi pi-thumbs-up',
        color: '#22c55e'
      }
    ],
    chartLabels: ['S1', 'S2', 'S3', 'S4'],
    chartBaselineKwh: [880, 890, 885, 892],
    chartActualKwh: [950, 965, 940, 920]
  },
  {
    id: 'INC-2026-0310',
    domain: 'compliance',
    kind: 'climate',
    severity: 'danger',
    orbState: 'live',
    locationPath: 'Corporate > Reporting > Q2 package',
    title: 'Evidence gap — missing meter reconciliation for May week 1',
    description:
      'ISO 50001 evidence chain broken for 4 submeters; blocks sign-off on intensity KPI for auditors.',
    assetLabel: 'RPT-Q2-ESG',
    inactiveCostUsd: 0,
    inactiveCarbonKgCo2e: 0,
    trendPercent: 0,
    trendDirection: 'up',
    trendSemantic: 'adverse',
    timeline: [
      {
        status: 'Compliance scan',
        date: '2026-05-04 05:00 UTC',
        icon: 'pi pi-shield',
        color: '#ef4444'
      },
      {
        status: 'Data owner notified',
        date: '2026-05-04 05:08 UTC',
        icon: 'pi pi-envelope',
        color: '#2563eb'
      }
    ],
    chartLabels: ['T1', 'T2', 'T3'],
    chartBaselineKwh: [100, 100, 100],
    chartActualKwh: [72, 68, 65]
  }
] as const;
