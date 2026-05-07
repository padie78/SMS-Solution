import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import type { CostCenterCatalogRow } from '../../../../core/models/hierarchy-catalog.model';
import { HierarchyCatalogService } from '../../../../services/state/hierarchy-catalog.service';

interface CostCenterOption {
  readonly label: string;
  readonly value: string;
}

@Component({
  selector: 'sms-cost-center-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoCompleteModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-column gap-2 w-full">
      <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider">Cost center</label>
      <p-autoComplete
        [(ngModel)]="selectedModel"
        [suggestions]="suggestions()"
        (completeMethod)="onQuery($event.query)"
        [dropdown]="true"
        [forceSelection]="true"
        [placeholder]="placeholder"
        (onSelect)="emitSelected()"
        (onClear)="clear()"
        field="label"
        styleClass="w-full"
        inputStyleClass="w-full"
      />
      <div class="text-[11px] text-slate-500" *ngIf="helpText">{{ helpText }}</div>
    </div>
  `
})
export class CostCenterAutocompleteComponent {
  private readonly catalog = inject(HierarchyCatalogService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Contexto para filtrar opciones (cuando aplique). */
  @Input() branchId?: string | null;
  @Input() buildingId?: string | null;
  @Input() placeholder = 'Buscar por nombre o ID…';
  @Input() helpText = 'Seleccioná un Cost Center existente para trazabilidad financiera.';

  @Input() value: string | null = null;
  @Output() valueChange = new EventEmitter<string | null>();

  // No usamos signals aquí porque ngModel no "trackea" reads indirectos para OnPush.
  // Propiedad normal + markForCheck asegura refresh del input.
  selected: CostCenterOption | null = null;
  readonly suggestions = signal<CostCenterOption[]>([]);

  private readonly rows = computed(() => this.catalog.catalog().costCenters);

  get selectedModel(): CostCenterOption | null {
    return this.selected;
  }
  set selectedModel(v: CostCenterOption | null) {
    this.selected = v;
  }

  constructor() {
    // Mantiene el input `value` reflejado en el UI incluso si el catálogo se carga después.
    effect(
      () => {
        const v = (this.value ?? '').trim();
        const rows = this.rows();
        if (!v) {
          this.selected = null;
          this.cdr.markForCheck();
          return;
        }
        const row = rows.find((x) => x.id === v);
        this.selected = row ? this.toOption(row) : { label: v, value: v };
        this.cdr.markForCheck();
      },
      { allowSignalWrites: true }
    );
  }

  onQuery(query: string | undefined): void {
    const q = (query ?? '').trim().toLowerCase();
    const filtered = this.filterRows(this.rows(), q);
    this.suggestions.set(filtered.slice(0, 25).map((r) => this.toOption(r)));
  }

  emitSelected(): void {
    const opt = this.selected;
    this.valueChange.emit(opt?.value ?? null);
  }

  clear(): void {
    this.selected = null;
    this.suggestions.set([]);
    this.valueChange.emit(null);
    this.cdr.markForCheck();
  }

  private filterRows(rows: readonly CostCenterCatalogRow[], q: string): CostCenterCatalogRow[] {
    const b = (this.branchId ?? '').trim();
    const building = (this.buildingId ?? '').trim();
    const filteredByBranch = b ? rows.filter((r) => r.branchId === b) : [...rows];
    // Catalog actual no incluye buildingId en CostCenterCatalogRow (solo branchId).
    // Si más adelante se agrega, podemos volver a filtrar por buildingId aquí.
    const filteredByContext = building ? filteredByBranch : filteredByBranch;
    if (!q) return filteredByContext;
    return filteredByContext.filter((r) => {
      const id = r.id.toLowerCase();
      const name = r.name.toLowerCase();
      return id.includes(q) || name.includes(q);
    });
  }

  private toOption(row: CostCenterCatalogRow): CostCenterOption {
    return { label: `${row.name} · ${row.id}`, value: row.id };
  }
}

