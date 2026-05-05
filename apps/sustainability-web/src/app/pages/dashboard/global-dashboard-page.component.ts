import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GlobalDashboardLayoutComponent } from '../../ui/templates/global-dashboard-layout/global-dashboard-layout.component';

@Component({
  selector: 'app-global-dashboard-page',
  standalone: true,
  imports: [GlobalDashboardLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-global-dashboard-layout />`
})
export class GlobalDashboardPageComponent {}
