import type { EChartsOption } from 'echarts';

/** Gauge limpio: impacto CO₂e (kg) de la factura recién confirmada. */
export function buildInvoiceSuccessCo2GaugeOption(co2eKg: number): EChartsOption {
  const max = Math.max(500, co2eKg * 1.35);
  return {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max,
        splitNumber: 5,
        radius: '92%',
        center: ['50%', '58%'],
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [0.35, '#22c55e'],
              [0.65, '#eab308'],
              [1, '#ef4444']
            ]
          }
        },
        pointer: { length: '58%', width: 6, itemStyle: { color: '#0f172a' } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#64748b', distance: 18, fontSize: 10 },
        title: {
          show: true,
          offsetCenter: [0, '78%'],
          color: '#64748b',
          fontSize: 11,
          fontWeight: 600
        },
        detail: {
          valueAnimation: true,
          formatter: '{value} kg CO₂e',
          color: '#0f172a',
          fontSize: 16,
          fontWeight: 800,
          offsetCenter: [0, '28%']
        },
        data: [{ value: co2eKg, name: 'Estimación operativa' }]
      }
    ]
  } as EChartsOption;
}
