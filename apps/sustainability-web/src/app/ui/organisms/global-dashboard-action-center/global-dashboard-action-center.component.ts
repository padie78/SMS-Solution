import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { AiAnalysisRecord, ImplementationEffort } from '../../../core/models/global-dashboard.model';
import { GlobalDashboardStateService } from '../../../features/dashboard/services/global-dashboard-state.service';
import { NotificationService } from '../../../services/ui/notification.service';
import { DashboardActionButtonComponent } from '../../atoms/dashboard-action-button/dashboard-action-button.component';
import { DashboardImpactBadgeComponent } from '../../atoms/dashboard-impact-badge/dashboard-impact-badge.component';
import { DashboardMetricLabelComponent } from '../../atoms/dashboard-metric-label/dashboard-metric-label.component';
import { DashboardSearchBarComponent } from '../../molecules/dashboard-search-bar/dashboard-search-bar.component';

@Component({
  selector: 'app-global-dashboard-action-center',
  standalone: true,
  imports: [
    DecimalPipe,
    DashboardActionButtonComponent,
    DashboardImpactBadgeComponent,
    DashboardMetricLabelComponent,
    DashboardSearchBarComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full min-w-0' },
  templateUrl: './global-dashboard-action-center.component.html',
  styleUrl: './global-dashboard-action-center.component.scss'
})
export class GlobalDashboardActionCenterComponent {
  readonly svc = inject(GlobalDashboardStateService);
  private readonly notify = inject(NotificationService);

  effortLabel(e: ImplementationEffort): string {
    if (e === 'LOW') return 'Esfuerzo bajo';
    if (e === 'MEDIUM') return 'Esfuerzo medio';
    return 'Esfuerzo alto';
  }

  effortTone(e: ImplementationEffort): 'emerald' | 'amber' | 'zinc' {
    if (e === 'LOW') return 'emerald';
    if (e === 'MEDIUM') return 'amber';
    return 'zinc';
  }

  formatRoi(eur: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
      eur
    );
  }

  onSearch(value: string): void {
    this.svc.setSearchQuery(value);
  }

  accept(rec: AiAnalysisRecord): void {
    this.notify.success('Orden prescriptiva encolada', `${rec.title} (${rec.recommendation_id})`);
  }
}
