import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import type { SmsNodeStatus } from '../../../../../core/models/sms-location-node.model';

type PrimeTagSeverity = 'success' | 'info' | 'warning' | 'danger' | undefined;

function mapSeverity(status?: SmsNodeStatus): PrimeTagSeverity {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'ALERT':
      return 'danger';
    case 'MAINTENANCE':
      return 'warning';
    default:
      return 'info';
  }
}

function mapLabel(status?: SmsNodeStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'ALERT':
      return 'Alert';
    case 'MAINTENANCE':
      return 'Maintenance';
    default:
      return 'Unknown';
  }
}

@Component({
  selector: 'sms-status-badge',
  standalone: true,
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-tag
      [severity]="severity"
      [value]="label"
      styleClass="border-round-xl font-semibold text-xs px-2 py-1"
    />
  `
})
export class SmsStatusBadgeComponent {
  @Input() status?: SmsNodeStatus;

  get severity(): PrimeTagSeverity {
    return mapSeverity(this.status);
  }

  get label(): string {
    return mapLabel(this.status);
  }
}

