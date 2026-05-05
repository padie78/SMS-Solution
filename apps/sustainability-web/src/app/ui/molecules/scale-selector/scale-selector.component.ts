import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import type { DashboardScale } from '../../../features/dashboard/services/dashboard-temporal-control.service';

interface ScaleOption {
  readonly label: string;
  readonly value: DashboardScale;
}

@Component({
  selector: 'ui-scale-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-selectButton
      [options]="options"
      optionLabel="label"
      optionValue="value"
      [ngModel]="value"
      (ngModelChange)="valueChange.emit($event)"
      styleClass="scale-selector"
    />
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        min-width: 0;
      }

      :host ::ng-deep .scale-selector .p-selectbutton {
        border-radius: 999px;
        overflow: hidden;
      }

      /* Evita que el selectButton crezca y solape otros CTAs */
      :host ::ng-deep .scale-selector .p-selectbutton .p-button {
        padding: 0.35rem 0.6rem;
        font-size: 0.75rem;
        font-weight: 800;
      }
    `
  ]
})
export class ScaleSelectorComponent {
  @Input({ required: true }) value!: DashboardScale;
  @Output() readonly valueChange = new EventEmitter<DashboardScale>();

  readonly options: ScaleOption[] = [
    { label: 'Día', value: 'DAY' },
    { label: 'Semana', value: 'WEEK' },
    { label: 'Mes', value: 'MONTH' },
    { label: 'Trim.', value: 'QUARTER' },
    { label: 'Año', value: 'YEAR' }
  ];
}

