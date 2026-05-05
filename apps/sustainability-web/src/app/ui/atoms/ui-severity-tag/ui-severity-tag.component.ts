import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import type { IncidentSeverity } from '../../../core/models/incident-center.model';

@Component({
  selector: 'ui-severity-tag',
  standalone: true,
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-tag [severity]="severity" [value]="label" styleClass="border-round-xl font-semibold text-xs" />
  `
})
export class UiSeverityTagComponent {
  @Input({ required: true }) severity!: IncidentSeverity;
  @Input({ required: true }) label!: string;
}
