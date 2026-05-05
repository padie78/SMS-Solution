import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import type { DashboardLayerOption, DashboardLayer } from '../../../features/dashboard/services/dashboard-layer-visibility.service';

@Component({
  selector: 'ui-layer-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-multiSelect
      [options]="options"
      optionLabel="label"
      optionValue="value"
      [ngModel]="value"
      (ngModelChange)="valueChange.emit($event)"
      [showToggleAll]="false"
      [filter]="false"
      defaultLabel="Capas del dashboard"
      selectedItemsLabel="{0} capas"
      display="comma"
      [maxSelectedLabels]="0"
      appendTo="body"
      styleClass="w-full border-round-xl layer-selector"
    ></p-multiSelect>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      /* Compacto y consistente con dashboard */
      :host ::ng-deep .layer-selector.p-multiselect {
        min-height: 40px;
        border-radius: 12px;
      }

      :host ::ng-deep .layer-selector .p-multiselect-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: #334155; /* slate-700 */
      }

      :host ::ng-deep .layer-selector .p-multiselect-token {
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 800;
      }

      /* Elimina el "textbox" de búsqueda del panel */
      :host ::ng-deep .p-multiselect-panel .p-multiselect-filter-container {
        display: none;
      }
    `
  ]
})
export class LayerSelectorComponent {
  @Input({ required: true }) options!: DashboardLayerOption[];
  @Input({ required: true }) value!: readonly DashboardLayer[];
  @Output() readonly valueChange = new EventEmitter<readonly DashboardLayer[]>();
}

