import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import type { DashboardContext, DashboardScale } from '../../../features/dashboard/services/dashboard-temporal-control.service';
import type { DashboardLayer, DashboardLayerOption } from '../../../features/dashboard/services/dashboard-layer-visibility.service';
import { ScaleSelectorComponent } from '../../molecules/scale-selector/scale-selector.component';
import { PeriodNavigatorComponent } from '../../molecules/period-navigator/period-navigator.component';
import { LayerSelectorComponent } from '../../molecules/layer-selector/layer-selector.component';

@Component({
  selector: 'ui-contextual-header',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ScaleSelectorComponent,
    PeriodNavigatorComponent,
    LayerSelectorComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-column gap-2 sm:flex-row sm:align-items-start sm:justify-content-between min-w-0">
      <div class="min-w-0 pr-2">
        <p class="text-xs font-bold text-emerald-700 m-0">{{ eyebrow }}</p>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight mt-1 m-0">{{ title }}</h1>
        @if (subtitle) {
          <p class="text-slate-500 text-sm max-w-3xl leading-relaxed mt-2 m-0">
            {{ subtitle }}
          </p>
        }
      </div>

      <div class="min-w-0 w-full sm:w-auto sm:min-w-[24rem]">
        <!-- Fila 1: label + refresh (nunca se pisan) -->
        <div class="flex items-center justify-end gap-2 min-w-0 w-full">
          <span
            class="text-xs font-mono text-slate-500 hidden sm:inline border border-slate-200 border-round-lg px-2 py-1 bg-white min-w-0"
            [class.opacity-60]="isLoading"
          >
            {{ periodLabel }}
          </span>

          <!-- Siempre icon-only: evita overflow en todos los breakpoints -->
          <p-button
            icon="pi pi-refresh"
            [outlined]="true"
            (onClick)="refresh.emit()"
            styleClass="p-button-outlined rounded-xl text-xs font-bold flex-none"
            [disabled]="isLoading"
            ariaLabel="Refrescar"
          />
        </div>

        <!-- Fila 2: controles temporales (wrap natural) -->
        <div class="flex flex-wrap items-center justify-end gap-3 mt-3 min-w-0 w-full">
          <ui-scale-selector [value]="context.scale" (valueChange)="scaleChange.emit($event)" />

          <div class="w-full sm:w-14rem max-w-full min-w-0" [class.opacity-60]="isLoading">
            <ui-period-navigator
              [scale]="context.scale"
              [referenceDate]="context.referenceDate"
              (referenceDateChange)="referenceDateChange.emit($event)"
              (monthChange)="monthChange.emit($event)"
              (quarterChange)="quarterChange.emit($event)"
              (yearChange)="yearChange.emit($event)"
            />
          </div>
        </div>

        <!-- Fila 3: selector de capas (tipo de gráficos) -->
        <div class="mt-3 min-w-0 w-full" [class.opacity-60]="isLoading">
          <ui-layer-selector
            [options]="layerOptions"
            [value]="layers"
            (valueChange)="layersChange.emit($event)"
          />
        </div>
      </div>
    </header>
  `
})
export class ContextualHeaderComponent {
  @Input({ required: true }) eyebrow!: string;
  @Input({ required: true }) title!: string;
  @Input() subtitle: string | null = null;

  @Input({ required: true }) context!: DashboardContext;
  @Input({ required: true }) periodLabel!: string;
  @Input() isLoading = false;

  @Input({ required: true }) layerOptions!: DashboardLayerOption[];
  @Input({ required: true }) layers!: readonly DashboardLayer[];

  @Output() readonly scaleChange = new EventEmitter<DashboardScale>();
  @Output() readonly referenceDateChange = new EventEmitter<Date>();
  @Output() readonly monthChange = new EventEmitter<number>();
  @Output() readonly quarterChange = new EventEmitter<number>();
  @Output() readonly yearChange = new EventEmitter<number>();
  @Output() readonly layersChange = new EventEmitter<readonly DashboardLayer[]>();
  @Output() readonly refresh = new EventEmitter<void>();
}

