import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import type { IncidentOrbState } from '../../../core/models/incident-center.model';

@Component({
  selector: 'ui-status-orb',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-block w-1rem h-1rem border-circle shadow-1 border-1 surface-border"
      [ngClass]="hostClass"
      role="status"
      [attr.aria-label]="ariaLabel"
    ></span>
  `,
  styleUrl: './ui-status-orb.component.scss'
})
export class UiStatusOrbComponent {
  @Input({ required: true }) state!: IncidentOrbState;

  @Input() ariaLabel = 'Live signal status';

  get hostClass(): string {
    switch (this.state) {
      case 'live':
        return 'ui-status-orb--live';
      case 'acknowledged':
        return 'ui-status-orb--ack';
      case 'stable':
      default:
        return 'surface-200';
    }
  }
}
