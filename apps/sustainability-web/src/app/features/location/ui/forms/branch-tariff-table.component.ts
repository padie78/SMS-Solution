import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal
} from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import type { TariffDTO } from '@sms/common';

import {
  TariffFormDialogComponent,
  type TariffFormDialogData
} from './tariff-form-dialog.component';

@Component({
  selector: 'sms-branch-tariff-table',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    TagModule,
    ConfirmDialogModule,
    DynamicDialogModule
  ],
  providers: [DialogService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0 box-border'
  },
  template: `
    <section class="flex w-full min-w-0 flex-col gap-4 box-border">
      <header
        class="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-emerald-50/60 to-white px-4 py-3 shadow-sm"
      >
        <div class="min-w-0">
          <h3 class="text-sm font-black uppercase tracking-wider text-slate-700">
            Tarifas / contratos
          </h3>
          <p class="mt-1 text-[12px] text-slate-500">
            Listá, creá y editá los contratos energéticos asociados a la sucursal.
          </p>
        </div>
        <button
          pButton
          type="button"
          icon="pi pi-plus"
          label="Añadir tarifa"
          class="border-round-xl text-xs font-bold"
          [disabled]="!canEdit()"
          (click)="openCreate()"
        ></button>
      </header>

      <div
        class="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
      >
        <p-table
          [value]="tariffs"
          dataKey="id"
          styleClass="w-full p-datatable-sm sms-tariff-grid"
          [tableStyle]="{ 'min-width': '50rem' }"
          [scrollable]="true"
          scrollHeight="flex"
          responsiveLayout="scroll"
        >
          <ng-template pTemplate="header">
            <tr class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600">
              <th class="px-4 py-3">Service Type</th>
              <th class="px-4 py-3">Provider</th>
              <th class="px-4 py-3">Pricing Model</th>
              <th class="px-4 py-3">Validity</th>
              <th class="w-44 px-4 py-3 text-right">Actions</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-row let-i="rowIndex">
            <tr class="border-t border-slate-100 transition-colors hover:bg-emerald-50/40">
              <td class="px-4 py-3">
                <p-tag
                  [value]="row.serviceType"
                  severity="info"
                  styleClass="text-[10px] font-bold uppercase tracking-wider"
                />
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col leading-tight">
                  <span class="text-sm font-semibold text-slate-800">{{ row.providerName }}</span>
                  <span class="text-[11px] text-slate-500">contract: {{ row.contractId }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <p-tag
                  [value]="row.pricingModel"
                  severity="warning"
                  styleClass="text-[10px] font-bold uppercase tracking-wider"
                />
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col text-[12px] leading-tight text-slate-700">
                  <span>
                    <span class="text-slate-400">From:</span> {{ row.validFrom }}
                  </span>
                  <span>
                    <span class="text-slate-400">To:</span> {{ row.validTo }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-2">
                  <button
                    pButton
                    type="button"
                    icon="pi pi-pencil"
                    class="p-button-rounded p-button-text p-button-sm"
                    aria-label="Editar tarifa"
                    [disabled]="!canEdit()"
                    (click)="openEdit(row, i)"
                  ></button>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-trash"
                    severity="danger"
                    class="p-button-rounded p-button-text p-button-sm"
                    aria-label="Eliminar tarifa"
                    [disabled]="!canEdit()"
                    (click)="confirmDelete(row, i)"
                  ></button>
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptyMessage">
            <tr>
              <td colspan="5" class="px-4 py-12 text-center">
                <div class="mx-auto flex max-w-sm flex-col items-center gap-3">
                  <div
                    class="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50"
                  >
                    <i class="pi pi-receipt text-xl text-emerald-700" aria-hidden="true"></i>
                  </div>
                  <div class="text-sm font-bold text-slate-800">Sin tarifas registradas</div>
                  <p class="text-[12px] text-slate-500">
                    Añadí el primer contrato energético para que las simulaciones y los reportes ESG
                    dispongan de tarifas vigentes.
                  </p>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-plus"
                    label="Añadir tarifa"
                    class="border-round-xl text-xs font-bold"
                    [disabled]="!canEdit()"
                    (click)="openCreate()"
                  ></button>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <p-confirmDialog
        [breakpoints]="{ '960px': '60vw', '640px': '90vw' }"
        styleClass="rounded-2xl"
      />
    </section>
  `
})
export class BranchTariffTableComponent {
  @Input({ required: true }) orgId!: string;
  @Input({ required: true }) branchId!: string;
  @Input() tariffs: TariffDTO[] = [];

  @Output() tariffsChange = new EventEmitter<TariffDTO[]>();

  private readonly dialogs = inject(DialogService);
  private readonly confirm = inject(ConfirmationService);
  private readonly openRefId = signal<symbol | null>(null);

  readonly canEdit = computed(() => Boolean(this.orgId?.trim() && this.branchId?.trim()));

  openCreate(): void {
    if (!this.canEdit()) return;
    this.openDialog({
      header: 'Nueva tarifa',
      data: { tariff: null, orgId: this.orgId, branchId: this.branchId },
      handler: (dto) => this.tariffsChange.emit([...this.tariffs, dto])
    });
  }

  openEdit(row: TariffDTO, index: number): void {
    if (!this.canEdit()) return;
    this.openDialog({
      header: `Editar tarifa · ${row.providerName}`,
      data: { tariff: row, orgId: this.orgId, branchId: this.branchId },
      handler: (dto) => {
        const next = this.tariffs.map((t, i) => (i === index ? dto : t));
        this.tariffsChange.emit(next);
      }
    });
  }

  confirmDelete(row: TariffDTO, index: number): void {
    this.confirm.confirm({
      message: `¿Está seguro de eliminar esta tarifa? · ${row.providerName} (${row.serviceType})`,
      header: 'Eliminar tarifa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const next = this.tariffs.filter((_, i) => i !== index);
        this.tariffsChange.emit(next);
      }
    });
  }

  private openDialog(opts: {
    header: string;
    data: TariffFormDialogData;
    handler: (dto: TariffDTO) => void;
  }): void {
    const token = Symbol('tariff-dialog');
    this.openRefId.set(token);
    const ref = this.dialogs.open(TariffFormDialogComponent, {
      header: opts.header,
      width: '85vw',
      style: { 'max-width': '1100px' },
      contentStyle: { padding: '1.5rem', overflow: 'auto', 'max-height': '85vh' },
      modal: true,
      dismissableMask: false,
      closable: true,
      styleClass: 'rounded-2xl',
      data: opts.data
    });
    ref.onClose.subscribe((result: TariffDTO | null | undefined) => {
      if (this.openRefId() !== token) return;
      this.openRefId.set(null);
      if (!result) return;
      opts.handler(result);
    });
  }
}
