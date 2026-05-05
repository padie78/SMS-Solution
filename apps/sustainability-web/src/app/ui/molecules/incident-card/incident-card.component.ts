import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CurrencyPipe, NgClass } from '@angular/common';
import type { IncidentRecord, IncidentSeverity } from '../../../core/models/incident-center.model';
import { UiMetricAtomComponent } from '../../atoms/ui-metric-atom/ui-metric-atom.component';
import { UiSeverityTagComponent } from '../../atoms/ui-severity-tag/ui-severity-tag.component';
import { UiStatusOrbComponent } from '../../atoms/ui-status-orb/ui-status-orb.component';
import { UiTrendBadgeComponent } from '../../atoms/ui-trend-badge/ui-trend-badge.component';

@Component({
  selector: 'ui-incident-card',
  standalone: true,
  imports: [
    CurrencyPipe,
    NgClass,
    UiMetricAtomComponent,
    UiSeverityTagComponent,
    UiStatusOrbComponent,
    UiTrendBadgeComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './incident-card.component.html',
  styleUrl: './incident-card.component.scss'
})
export class IncidentCardComponent {
  @Input({ required: true }) incident!: IncidentRecord;

  @Output() readonly openDetail = new EventEmitter<IncidentRecord>();

  readonly cardShellClass =
    'bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-emerald-200/80 transition-all cursor-pointer select-none border-l-4';

  severityClass(sev: IncidentSeverity): string {
    const map: Record<IncidentSeverity, string> = {
      danger: 'incident-card--sev-danger',
      warning: 'incident-card--sev-warning',
      info: 'incident-card--sev-info'
    };
    return map[sev];
  }

  severityLabel(inc: IncidentRecord): string {
    if (inc.severity === 'danger') return 'Crítico';
    if (inc.severity === 'warning') return 'Elevado';
    return 'Atención';
  }

  onActivate(): void {
    this.openDetail.emit(this.incident);
  }

  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.onActivate();
    }
  }
}
