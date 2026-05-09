import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  type OnChanges,
  Output,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import type { CostCenterDTO } from '@sms/common';
import { OrganizationCostCenterRegistryService } from '../../../../services/state/organization-cost-center-registry.service';

interface CostCenterPickerOption {
  readonly value: string;
  readonly label: string;
  readonly subLabel: string;
  readonly tagSeverity: 'success' | 'info' | 'warning' | 'secondary';
  readonly raw: CostCenterDTO;
}

/**
 * Selector multi-asignación de Cost Centers para un nodo de la jerarquía física
 * (Branch / Building / Asset / Meter). Lee del registro centralizado
 * (`OrganizationCostCenterRegistryService`) cuyas filas son los CCs creados desde
 * la pestaña "Centros de Costo" del formulario de Organization.
 *
 * Soporta múltiples asignaciones para habilitar reglas de allocation transversal
 * (porcentajes, MACC ranking, distribución por área/operación, etc.).
 *
 * Contrato:
 * - `organizationId` → contexto requerido para listar opciones.
 * - `value` → arreglo de IDs de CCs actualmente asignados al nodo.
 * - `valueChange` → emite el nuevo arreglo (puede ser vacío).
 *
 * Si la organización no tiene CCs definidos, el control queda deshabilitado y
 * se muestra un CTA hacia la pestaña correspondiente del formulario Organization.
 */
@Component({
  selector: 'sms-node-cost-center-multi-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, MultiSelectModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0 box-border'
  },
  template: `
    <div class="flex w-full min-w-0 flex-col gap-2 box-border">
      <label
        class="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
        [attr.for]="inputId"
      >
        {{ label }}
      </label>

      <p-multiSelect
        [inputId]="inputId"
        [options]="options()"
        [ngModel]="value"
        (ngModelChange)="onChange($event)"
        optionLabel="label"
        optionValue="value"
        [filter]="true"
        filterBy="label,subLabel"
        appendTo="body"
        styleClass="w-full border-round-xl"
        [placeholder]="resolvedPlaceholder()"
        [disabled]="isDisabled()"
        [showClear]="true"
        [showToggleAll]="true"
        [emptyMessage]="emptyMessage()"
        [emptyFilterMessage]="emptyMessage()"
        display="chip"
        [maxSelectedLabels]="3"
        selectedItemsLabel="{0} centros seleccionados"
      >
        <ng-template let-opt pTemplate="item">
          <div class="flex w-full flex-col leading-tight">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm font-semibold text-slate-800">{{ opt.label }}</span>
              <p-tag
                [value]="opt.raw.type"
                [severity]="opt.tagSeverity"
                styleClass="text-[9px] font-bold uppercase tracking-wider"
              />
            </div>
            <span class="text-[11px] text-slate-500">{{ opt.subLabel }}</span>
          </div>
        </ng-template>
      </p-multiSelect>

      @if (!organizationId || organizationId.trim().length === 0) {
        <small class="text-[11px] text-amber-700">
          Falta el contexto organizacional para listar centros de costo.
        </small>
      } @else if (options().length === 0) {
        <small class="text-[11px] text-slate-500">
          La organización aún no tiene centros de costo. Creá uno desde la pestaña
          <strong>Centros de Costo</strong> del formulario de Organization.
        </small>
      } @else if (helpText) {
        <small class="text-[11px] text-slate-500">{{ helpText }}</small>
      }

      @if (selectedSummary().length > 0) {
        <div
          class="mt-1 flex w-full flex-col gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-3 py-2 text-[11px] text-emerald-900"
        >
          <div class="flex items-center gap-2">
            <i class="pi pi-link text-emerald-700" aria-hidden="true"></i>
            <span class="font-bold">Centros de costo asignados ({{ selectedSummary().length }}):</span>
          </div>
          <ul class="flex flex-col gap-1 pl-1">
            @for (item of selectedSummary(); track item.id) {
              <li class="flex items-center gap-2">
                <i class="pi pi-circle-fill text-[6px] text-emerald-600" aria-hidden="true"></i>
                <span class="font-semibold">{{ item.label }}</span>
                <span class="text-[10px] text-emerald-700/80">· {{ item.subLabel }}</span>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `
})
export class NodeCostCenterMultiPickerComponent implements OnChanges {
  private readonly registry = inject(OrganizationCostCenterRegistryService);

  @Input() label = 'Centros de costo asignados';
  @Input() helpText: string | null =
    'Podés asignar uno o varios centros de costo para distribución de presupuesto y trazabilidad ESG.';
  @Input() placeholder: string | null = null;
  @Input() inputId = 'node-cc-multi-picker';
  @Input() disabled = false;

  /** Org owner cuyos CCs alimentan el dropdown. Usualmente `controls.organizationId.value` o el ctx jerárquico. */
  @Input({ required: true }) organizationId!: string;

  /** Lista actual de IDs asignados (puede estar vacía). */
  @Input() value: string[] = [];

  /** Emite el nuevo arreglo de IDs seleccionados (vacío si se limpian todos). */
  @Output() valueChange = new EventEmitter<string[]>();

  private readonly orgIdSignal = signal<string>('');

  /** Lista de Cost Centers disponibles para la org actual (reactiva). */
  readonly costCenters = this.registry.costCentersForSignal(() => this.orgIdSignal());

  readonly options = computed<CostCenterPickerOption[]>(() =>
    this.costCenters().map((cc) => mapToOption(cc))
  );

  readonly selectedSummary = computed<{ id: string; label: string; subLabel: string }[]>(() => {
    const ids = Array.isArray(this.value) ? this.value : [];
    if (ids.length === 0) return [];
    const opts = this.options();
    return ids.map((id) => {
      const found = opts.find((o) => o.value === id);
      if (!found) return { id, label: id, subLabel: '(sin metadata local)' };
      return { id, label: found.label, subLabel: found.subLabel };
    });
  });

  ngOnChanges(): void {
    this.orgIdSignal.set((this.organizationId ?? '').trim());
  }

  resolvedPlaceholder(): string {
    if (this.placeholder) return this.placeholder;
    if (!this.organizationId || this.organizationId.trim().length === 0) {
      return 'Resolvé el contexto organizacional…';
    }
    if (this.costCenters().length === 0) return 'No hay centros de costo disponibles';
    return 'Seleccioná uno o varios centros de costo…';
  }

  isDisabled(): boolean {
    if (this.disabled) return true;
    if (!this.organizationId || this.organizationId.trim().length === 0) return true;
    return this.costCenters().length === 0;
  }

  emptyMessage(): string {
    return 'Sin coincidencias. Creá centros de costo en la pestaña Organization → Centros de Costo.';
  }

  onChange(next: string[] | null | undefined): void {
    const cleaned = Array.isArray(next)
      ? next.map((v) => (typeof v === 'string' ? v.trim() : '')).filter((v) => v.length > 0)
      : [];
    // Deduplicación defensiva (PrimeNG no debería duplicar pero metemos cinturón).
    const unique = Array.from(new Set(cleaned));
    this.valueChange.emit(unique);
  }
}

function mapToOption(cc: CostCenterDTO): CostCenterPickerOption {
  const budget = Number.isFinite(cc.annualBudget) ? cc.annualBudget : 0;
  const currency = (cc.currency ?? '').trim() || 'USD';
  const sub = `${cc.externalId ? cc.externalId + ' · ' : ''}${budget.toLocaleString()} ${currency}`;
  return {
    value: cc.id,
    label: cc.name,
    subLabel: sub,
    tagSeverity: typeToSeverity(cc.type),
    raw: cc
  };
}

function typeToSeverity(type: CostCenterDTO['type']): CostCenterPickerOption['tagSeverity'] {
  switch (type) {
    case 'OPERATIONAL_UNIT':
      return 'success';
    case 'DEPARTMENT':
      return 'info';
    case 'PROJECT':
      return 'warning';
    case 'SERVICE':
    default:
      return 'secondary';
  }
}
