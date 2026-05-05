import type { EChartsOption } from 'echarts';
import type { TelemetryAsset } from '../../../core/models/iot-telemetry.model';

/** Misma paleta clara que `global-dashboard-chart-options.ts` (continuidad con Global Dashboard). */
const TEXT = '#64748b';
const GRID = '#e2e8f0';
const AXIS = '#cbd5e1';
const EMERALD = '#059669';
const BLUE = '#2563eb';
const AMBER = '#d97706';
const RED = '#dc2626';
const BG = 'transparent';
const TOOLTIP_BG = 'rgba(255,255,255,0.98)';
const TOOLTIP_BORDER = '#e2e8f0';
const TOOLTIP_TEXT = '#334155';

export function buildTelemetryTimeSeriesOption(asset: TelemetryAsset): EChartsOption {
  const { points, forecast, constraints } = asset;
  const last = points[points.length - 1]!;

  const ampsHist: [number, number][] = points.map((p) => [p.t, p.amps]);
  const voltsHist: [number, number][] = points.map((p) => [p.t, p.volts]);
  const forecastLineData: [number, number][] = [
    [last.t, last.amps],
    ...forecast.slice(1).map((p): [number, number] => [p.t, p.amps])
  ];

  return {
    backgroundColor: BG,
    textStyle: { color: TEXT },
    animationDuration: 300,
    grid: { left: 56, right: 56, top: 52, bottom: 88 },
    legend: {
      data: ['Corriente (A)', 'Tensión (V)', 'Proyección 60 min'],
      textStyle: { color: TEXT },
      top: 4
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: AXIS } },
      backgroundColor: TOOLTIP_BG,
      borderColor: TOOLTIP_BORDER,
      textStyle: { color: TOOLTIP_TEXT, fontSize: 11 }
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      { type: 'slider', xAxisIndex: 0, height: 22, bottom: 8, borderColor: GRID, handleStyle: { color: EMERALD } }
    ],
    visualMap: {
      show: true,
      type: 'piecewise',
      seriesIndex: 0,
      dimension: 1,
      orient: 'horizontal',
      left: 'center',
      bottom: 36,
      textStyle: { color: TEXT, fontSize: 10 },
      pieces: [
        { min: constraints.trip_amps * 0.95, label: 'Zona crítica (I)', color: 'rgba(254,202,202,0.45)' },
        {
          min: constraints.nominal_amps * 1.08,
          max: constraints.trip_amps * 0.95,
          label: 'Alerta (I)',
          color: 'rgba(253,230,138,0.35)'
        },
        { max: constraints.nominal_amps * 1.08, label: 'Operación', color: 'rgba(209,250,229,0.25)' }
      ],
      outOfRange: { color: 'rgba(241,245,249,0.2)' }
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: { color: TEXT, fontSize: 10 }
    },
    yAxis: [
      {
        type: 'value',
        name: 'I (A)',
        position: 'left',
        nameTextStyle: { color: TEXT },
        axisLine: { show: true, lineStyle: { color: AXIS } },
        splitLine: { lineStyle: { color: GRID } },
        axisLabel: { color: TEXT, fontSize: 10 }
      },
      {
        type: 'value',
        name: 'V (V)',
        position: 'right',
        nameTextStyle: { color: TEXT },
        axisLine: { show: true, lineStyle: { color: AXIS } },
        splitLine: { show: false },
        axisLabel: { color: TEXT, fontSize: 10 }
      }
    ],
    series: [
      {
        name: 'Corriente (A)',
        type: 'line',
        yAxisIndex: 0,
        showSymbol: false,
        smooth: false,
        sampling: 'lttb',
        lineStyle: { width: 1.5, color: EMERALD },
        data: ampsHist,
        markLine: {
          silent: true,
          symbol: 'none',
          label: { color: TOOLTIP_TEXT, fontSize: 10 },
          data: [
            {
              yAxis: constraints.nominal_amps,
              lineStyle: { type: 'dotted', color: AXIS },
              label: { formatter: 'I nominal' }
            },
            {
              yAxis: constraints.trip_amps,
              lineStyle: { type: 'dashed', color: RED },
              label: { formatter: 'I trip' }
            }
          ]
        },
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(248,113,113,0.06)' },
          data: [
            [
              { yAxis: constraints.trip_amps * 0.9 },
              { yAxis: constraints.trip_amps * 1.15 }
            ]
          ]
        }
      },
      {
        name: 'Tensión (V)',
        type: 'line',
        yAxisIndex: 1,
        showSymbol: false,
        smooth: false,
        sampling: 'lttb',
        lineStyle: { width: 1.2, color: BLUE, opacity: 0.85 },
        data: voltsHist,
        markLine: {
          silent: true,
          symbol: 'none',
          label: { color: TOOLTIP_TEXT, fontSize: 10 },
          data: [
            {
              yAxis: constraints.nominal_volts,
              lineStyle: { type: 'dotted', color: AXIS },
              label: { formatter: 'V nominal' }
            },
            {
              yAxis: constraints.low_volts,
              lineStyle: { type: 'dashed', color: AMBER },
              label: { formatter: 'V mín' }
            }
          ]
        }
      },
      {
        name: 'Proyección 60 min',
        type: 'line',
        yAxisIndex: 0,
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 2, type: 'dashed', color: '#64748b' },
        data: forecastLineData
      }
    ]
  } as EChartsOption;
}
