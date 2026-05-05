import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GlobalDashboardPageComponent } from '../../pages/dashboard/global-dashboard-page.component';

/**
 * Ruta `/dashboard` — shell que monta la página del dashboard global ESG.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [GlobalDashboardPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-global-dashboard-page />`
})
export class DashboardComponent {}
