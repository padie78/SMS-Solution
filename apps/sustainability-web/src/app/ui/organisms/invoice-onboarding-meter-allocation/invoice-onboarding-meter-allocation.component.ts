import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { InvoiceOnboardingUiService } from '../../../features/invoice-onboarding/services/invoice-onboarding-ui.service';
import { InvoiceStateService } from '../../../services/state/invoice-state.service';

@Component({
  selector: 'app-invoice-onboarding-meter-allocation',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputNumberModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-600 m-0 mb-4">Distribución por medidor</h3>
        <p class="text-sm text-slate-500 m-0 leading-relaxed">
          Asigna kWh por medidor. La suma debe coincidir con el consumo total de la factura ({{ targetKwh() | number : '1.0-2' }} kWh).
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <p-table [value]="rows()" styleClass="p-datatable-sm w-full">
          <ng-template pTemplate="header">
            <tr>
              <th>Medidor</th>
              <th>Sede</th>
              <th class="text-right whitespace-nowrap min-w-[11rem]">kWh asignados</th>
            </tr>
          </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-semibold text-slate-800">{{ row.label }}</td>
            <td class="text-slate-600 text-sm">{{ row.site }}</td>
            <td class="text-right">
              <p-inputNumber
                [ngModel]="row.allocatedKwh"
                (ngModelChange)="onCellChange(row.id, $event)"
                [min]="0"
                [maxFractionDigits]="2"
                inputStyleClass="w-full text-right"
              />
            </td>
          </tr>
        </ng-template>
        </p-table>
      </div>
      <div class="flex justify-between items-center flex-wrap gap-3 border-t border-slate-200 pt-4 mt-1">
        <div class="text-sm">
          <span class="text-slate-500 font-bold uppercase text-xs">Total asignado</span>
          <span class="ml-2 font-bold" [class.text-red-600]="!balanced()" [class.text-emerald-700]="balanced()">
            {{ allocatedTotal() | number : '1.0-2' }} kWh
          </span>
        </div>
        <p-button
          label="Continuar"
          icon="pi pi-arrow-right"
          iconPos="right"
          styleClass="p-button-emerald rounded-xl text-xs font-bold px-6"
          [disabled]="!balanced()"
          (onClick)="emitContinue()"
        />
      </div>
    </div>
  `
})
export class InvoiceOnboardingMeterAllocationComponent {
  private readonly invoiceState = inject(InvoiceStateService);
  private readonly onboarding = inject(InvoiceOnboardingUiService);

  @Output() readonly continue = new EventEmitter<void>();

  readonly rows = this.onboarding.meterRows;
  readonly allocatedTotal = this.onboarding.allocatedTotalKwh;

  targetKwh(): number {
    return this.invoiceState.getSnapshot().extractedData?.consumption ?? 0;
  }

  balanced(): boolean {
    return this.onboarding.allocationMatchesInvoice();
  }

  onCellChange(id: string, value: number | null): void {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    this.onboarding.patchMeterRow(id, n);
  }

  emitContinue(): void {
    if (!this.balanced()) return;
    this.continue.emit();
  }
}
