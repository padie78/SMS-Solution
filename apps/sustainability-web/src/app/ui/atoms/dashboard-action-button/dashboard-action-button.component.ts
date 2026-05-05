import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'ui-dashboard-action-button',
  standalone: true,
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-button
      [label]="label"
      [icon]="icon"
      [disabled]="disabled"
      [loading]="loading"
      (onClick)="clicked.emit()"
      styleClass="rounded-xl text-xs font-bold shadow-sm"
      severity="success"
    />
  `
})
export class DashboardActionButtonComponent {
  @Input({ required: true }) label!: string;
  @Input() icon = 'pi pi-check';
  @Input() disabled = false;
  @Input() loading = false;

  @Output() readonly clicked = new EventEmitter<void>();
}
