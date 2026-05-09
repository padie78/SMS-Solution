import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import type { TariffDTO } from '@sms/common';

import { TariffFormComponent } from './tariff-form.component';
import {
  buildTariffFormGroup,
  hydrateTariffFormFromPartial,
  tariffFormRawValueToDTO,
  type TariffFormGroup,
  type TariffFormValue
} from './tariff-form.config';

/**
 * Payload aceptado por el modal. `tariff` ausente o nulo → modo creación.
 */
export interface TariffFormDialogData {
  readonly tariff?: TariffDTO | null;
  readonly orgId: string;
  readonly branchId: string;
}

@Component({
  selector: 'sms-tariff-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, TariffFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex w-full flex-col gap-5 box-border">
      <sms-tariff-form [form]="form" />

      @if (errorMsg()) {
        <div
          role="alert"
          class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-[12px] font-semibold text-rose-700"
        >
          {{ errorMsg() }}
        </div>
      }

      <div class="flex w-full flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          pButton
          type="button"
          label="Cancelar"
          icon="pi pi-times"
          severity="secondary"
          class="border-round-xl text-xs font-bold"
          (click)="cancel()"
        ></button>
        <button
          pButton
          type="button"
          [label]="isEdit() ? 'Actualizar tarifa' : 'Crear tarifa'"
          icon="pi pi-save"
          class="border-round-xl text-xs font-bold"
          (click)="save()"
          [disabled]="form.invalid"
        ></button>
      </div>
    </div>
  `
})
export class TariffFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly config = inject(DynamicDialogConfig<TariffFormDialogData>);
  private readonly ref = inject(DynamicDialogRef<TariffDTO | null>);

  readonly form: TariffFormGroup = buildTariffFormGroup(this.fb);
  readonly isEdit = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    const data = this.config.data;
    if (!data) {
      this.errorMsg.set('Falta la configuración del modal (DynamicDialogConfig.data).');
      return;
    }

    const orgId = (data.orgId ?? '').trim();
    const branchId = (data.branchId ?? '').trim();
    const incoming = data.tariff ?? null;

    hydrateTariffFormFromPartial(
      this.form,
      (incoming ?? {}) as Partial<TariffDTO>,
      orgId,
      branchId
    );

    this.isEdit.set(Boolean(incoming?.id));

    this.form.controls.orgId.disable({ emitEvent: false });
    this.form.controls.branchId.disable({ emitEvent: false });
    this.form.markAllAsTouched();
  }

  save(): void {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Revisá los campos obligatorios (proveedor, tipo de servicio, tarifa base, etc.).');
      return;
    }
    try {
      const dto = tariffFormRawValueToDTO(this.form.getRawValue() as TariffFormValue);
      this.ref.close(dto);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo procesar el DTO.';
      this.errorMsg.set(msg);
    }
  }

  cancel(): void {
    this.ref.close(null);
  }
}
