import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SidebarModule } from 'primeng/sidebar';
import { TimelineModule } from 'primeng/timeline';
import type {
  IncidentDomain,
  IncidentRecord,
  IncidentTimelineItem
} from '../../../core/models/incident-center.model';
import { INCIDENT_CENTER_SAMPLE_DATA } from '../../../features/incident-center/data/incident-center.sample-data';
import { IncidentCardComponent } from '../../molecules/incident-card/incident-card.component';
import { NotificationService } from '../../../services/ui/notification.service';

let chartJsRegistered = false;

function ensureChartJs(): void {
  if (!chartJsRegistered) {
    Chart.register(...registerables);
    chartJsRegistered = true;
  }
}

@Component({
  selector: 'app-incident-center-board',
  standalone: true,
  imports: [
    ButtonModule,
    ChartModule,
    IncidentCardComponent,
    InputGroupAddonModule,
    InputGroupModule,
    InputTextModule,
    SidebarModule,
    TimelineModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './incident-center-board.component.html',
  styleUrls: [
    './incident-center-board.component.scss',
    '../../../features/incident-center/incident-center-ui.css'
  ]
})
export class IncidentCenterBoardComponent {
  private readonly notify = inject(NotificationService);

  constructor() {
    ensureChartJs();
  }

  readonly domainFilter = signal<IncidentDomain | 'all'>('all');
  readonly searchQuery = signal('');
  readonly incidents = signal<readonly IncidentRecord[]>(INCIDENT_CENTER_SAMPLE_DATA);

  readonly filteredIncidents = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const d = this.domainFilter();
    return this.incidents().filter((i) => {
      if (d !== 'all' && i.domain !== d) return false;
      if (!q) return true;
      return (
        i.id.toLowerCase().includes(q) ||
        i.assetLabel.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q)
      );
    });
  });

  readonly detailOpen = signal(false);
  readonly selectedIncident = signal<IncidentRecord | null>(null);

  readonly chartType = 'line' as const;

  readonly chartData = computed<ChartData<'line'>>(() => {
    const sel = this.selectedIncident();
    if (!sel) {
      return { labels: [], datasets: [] };
    }
    return {
      labels: [...sel.chartLabels],
      datasets: [
        {
          type: 'line',
          label: 'Historical expected (kWh)',
          data: [...sel.chartBaselineKwh],
          tension: 0.25,
          borderColor: '#64748b',
          backgroundColor: 'rgba(100, 116, 139, 0.12)',
          fill: false
        },
        {
          type: 'line',
          label: 'Current observed (kWh)',
          data: [...sel.chartActualKwh],
          tension: 0.25,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          fill: false
        }
      ]
    };
  });

  readonly chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, font: { size: 11 } }
      },
      title: {
        display: true,
        text: 'Consumo observado vs esperado (kWh)',
        font: { size: 13, weight: 'bold' }
      }
    },
    scales: {
      x: {
        ticks: { maxRotation: 0, autoSkip: true }
      },
      y: {
        beginAtZero: false,
        ticks: { font: { family: 'ui-monospace, monospace' } }
      }
    }
  };

  setDomain(d: IncidentDomain | 'all'): void {
    this.domainFilter.set(d);
  }

  /** Alineado a filtros / CTAs del dashboard global (rounded-xl, text-xs). */
  filterButtonClass(d: IncidentDomain | 'all'): string {
    const on = this.domainFilter() === d;
    const base = 'rounded-xl font-bold text-xs h-10 px-4';
    if (on) {
      return `${base} p-button-emerald shadow-sm`;
    }
    return `${base} p-button-outlined text-slate-600 !border-slate-200`;
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  onOpenDetail(inc: IncidentRecord): void {
    this.selectedIncident.set(inc);
    this.detailOpen.set(true);
  }

  onSidebarVisible(visible: boolean): void {
    this.detailOpen.set(visible);
    if (!visible) {
      this.selectedIncident.set(null);
    }
  }

  acknowledge(): void {
    const id = this.selectedIncident()?.id;
    this.notify.success('Incident acknowledged', id ? `Reference ${id}` : undefined);
  }

  assignTechnician(): void {
    const id = this.selectedIncident()?.id;
    this.notify.show('info', 'Assignment queued', id ? `Technician pool notified — ${id}` : undefined);
  }

  openEvidenceVault(): void {
    this.notify.show('info', 'Evidence Vault', 'Opening immutable evidence chain for this incident (demo).');
  }

  /** PrimeNG timeline expects a mutable array contract. */
  timelineRows(inc: IncidentRecord): IncidentTimelineItem[] {
    return [...inc.timeline];
  }
}
