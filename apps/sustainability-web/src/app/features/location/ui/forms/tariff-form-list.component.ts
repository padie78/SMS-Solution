import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  computed,
  inject
} from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import type { TariffDTO } from '@sms/common';
import { TariffFormComponent } from './tariff-form.component';
import {
  buildTariffFormGroup,
  hydrateTariffFormFromPartial,
  tariffFormRawValueToDTO,
  type TariffFormGroup,
  type TariffFormValue
} from './tariff-form.config';

@Component({
  selector: 'sms-tariff-form-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, ButtonModule, TariffFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card styleClass="w-full border-round-2xl shadow-1 overflow-hidden">
      <ng-template pTemplate="title">Tarifas / contratos</ng-template>
      <ng-template pTemplate="subtitle">Gestioná uno o varios contratos para esta sucursal.</ng-template>

      <div class="flex flex-col gap-4 min-w-0">
        <div class="flex flex-wrap gap-2">
          <button pButton type="button" label="Añadir tarifa" icon="pi pi-plus" (click)="add()"></button>
          <button
            pButton
            type="button"
            label="Emitir cambios"
            icon="pi pi-send"
            severity="secondary"
            (click)="emitTariffs()"
            [disabled]="array.invalid"
          ></button>
        </div>

        <div class="text-[11px] text-rose-700" *ngIf="array.invalid">
          Hay tarifas inválidas. Revisá pestañas, campos obligatorios y rangos (ej. JSON de escalones).
        </div>

        <div class="flex flex-col gap-6 min-w-0">
          @for (g of groups(); track trackGroup($index, g); let i = $index) {
            <div
              class="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 shadow-sm md:p-4 box-border min-w-0"
            >
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div class="text-xs font-black uppercase tracking-wider text-slate-600">Tarifa #{{ i + 1 }}</div>
                <button
                  pButton
                  type="button"
                  label="Quitar"
                  icon="pi pi-trash"
                  severity="danger"
                  (click)="remove(i)"
                ></button>
              </div>
              <sms-tariff-form [form]="g" />
            </div>
          }
        </div>
      </div>
    </p-card>
  `
})
export class TariffFormListComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) orgId!: string;
  @Input({ required: true }) branchId!: string;
  @Output() tariffsChange = new EventEmitter<TariffDTO[]>();

  readonly array = this.fb.array<TariffFormGroup>([]);
  readonly groups = computed(() => this.array.controls);

  ngOnChanges(): void {
    for (const g of this.array.controls) {
      g.controls.orgId.setValue(this.orgId, { emitEvent: false });
      g.controls.branchId.setValue(this.branchId, { emitEvent: false });
      g.controls.orgId.disable({ emitEvent: false });
      g.controls.branchId.disable({ emitEvent: false });
    }
  }

  trackGroup(index: number, g: TariffFormGroup): string {
    const id = g.controls.id.value?.trim();
    return id || `new-${index}`;
  }

  add(): void {
    const g = buildTariffFormGroup(this.fb);
    hydrateTariffFormFromPartial(g, {}, this.orgId, this.branchId);
    g.controls.orgId.disable({ emitEvent: false });
    g.controls.branchId.disable({ emitEvent: false });
    this.array.push(g);
  }

  remove(i: number): void {
    this.array.removeAt(i);
    this.emitTariffs();
  }

  emitTariffs(): void {
    if (this.array.invalid) return;
    this.tariffsChange.emit(
      this.array.controls.map((g) => tariffFormRawValueToDTO(g.getRawValue() as TariffFormValue))
    );
  }
}
