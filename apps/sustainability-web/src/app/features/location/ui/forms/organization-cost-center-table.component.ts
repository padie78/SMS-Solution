import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import type { CostCenterDTO } from '@sms/common';

import {
  OrganizationCostCenterFormDialogComponent,
  type OrganizationCostCenterDialogData
} from './organization-cost-center-form-dialog.component';

@Component({
  selector: 'sms-organization-cost-center-table',
  standalone: true,
  imports: [CommonModule, ButtonModule, ConfirmDialogModule, DynamicDialogModule, TableModule, TagModule],
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
            Centros de costo
          </h3>
          <p class="mt-1 text-[12px] text-slate-500">
            Gestioná unidades presupuestarias transversales para trazabilidad financiera y ESG.
          </p>
        </div>
        <button
          pButton
          type="button"
          icon="pi pi-plus"
          label="Agregar Centro de Costo"
          class="border-round-xl text-xs font-bold"
          [disabled]="!canEdit()"
          (click)="openCreate()"
        ></button>
      </header>

      <div class="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <p-table
          [value]="costCenters"
          dataKey="id"
          styleClass="w-full p-datatable-sm"
          [tableStyle]="{ 'min-width': '58rem' }"
          [scrollable]="true"
          scrollHeight="flex"
          responsiveLayout="scroll"
        >
          <ng-template pTemplate="header">
            <tr class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600">
              <th class="px-4 py-3">Nombre</th>
              <th class="px-4 py-3">Código Externo</th>
              <th class="px-4 py-3">Responsable</th>
              <th class="px-4 py-3">Presupuesto Anual</th>
              <th class="w-44 px-4 py-3 text-right">Acciones</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-row let-i="rowIndex">
            <tr class="border-t border-slate-100 transition-colors hover:bg-emerald-50/40">
              <td class="px-4 py-3">
                <div class="flex flex-col leading-tight">
                  <span class="text-sm font-semibold text-slate-800">{{ row.name }}</span>
                  <span class="text-[11px] text-slate-500">{{ row.type }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <p-tag
                  [value]="row.externalId || 'N/A'"
                  severity="info"
                  styleClass="text-[10px] font-bold uppercase tracking-wider"
                />
              </td>
              <td class="px-4 py-3">
                <span class="text-[12px] text-slate-700">{{ row.managerEmail || 'Sin responsable' }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="text-sm font-bold text-slate-800">
                  {{ row.annualBudget | number: '1.0-2' }} {{ row.currency }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-2">
                  <button
                    pButton
                    type="button"
                    icon="pi pi-pencil"
                    class="p-button-rounded p-button-text p-button-sm"
                    aria-label="Editar centro de costo"
                    [disabled]="!canEdit()"
                    (click)="openEdit(row, i)"
                  ></button>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-trash"
                    severity="danger"
                    class="p-button-rounded p-button-text p-button-sm"
                    aria-label="Eliminar centro de costo"
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
                  <div class="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
                    <i class="pi pi-wallet text-xl text-emerald-700" aria-hidden="true"></i>
                  </div>
                  <div class="text-sm font-bold text-slate-800">Sin centros de costo registrados</div>
                  <p class="text-[12px] text-slate-500">
                    Agregá el primer centro de costo para vincular presupuesto, intensidad y objetivos de carbono.
                  </p>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-plus"
                    label="Agregar Centro de Costo"
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

      <p-confirmDialog [breakpoints]="{ '960px': '60vw', '640px': '90vw' }" styleClass="rounded-2xl" />
    </section>
  `
})
export class OrganizationCostCenterTableComponent {
  @Input({ required: true }) organizationId!: string;
  @Input() costCenters: CostCenterDTO[] = [];

  @Output() costCentersChange = new EventEmitter<CostCenterDTO[]>();

  private readonly dialogs = inject(DialogService);
  private readonly confirm = inject(ConfirmationService);

  readonly canEdit = computed(() => Boolean(this.organizationId?.trim()));

  openCreate(): void {
    if (!this.canEdit()) return;
    this.openDialog({
      header: 'Nuevo centro de costo',
      data: { organizationId: this.organizationId, costCenter: null },
      handler: (dto) => this.costCentersChange.emit([...this.costCenters, dto])
    });
  }

  openEdit(row: CostCenterDTO, index: number): void {
    if (!this.canEdit()) return;
    this.openDialog({
      header: `Editar centro de costo · ${row.name}`,
      data: { organizationId: this.organizationId, costCenter: row },
      handler: (dto) => this.costCentersChange.emit(this.costCenters.map((item, i) => (i === index ? dto : item)))
    });
  }

  confirmDelete(row: CostCenterDTO, index: number): void {
    this.confirm.confirm({
      message: `¿Está seguro de eliminar este centro de costo? · ${row.name}`,
      header: 'Eliminar centro de costo',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.costCentersChange.emit(this.costCenters.filter((_, i) => i !== index))
    });
  }

  private openDialog(opts: {
    header: string;
    data: OrganizationCostCenterDialogData;
    handler: (dto: CostCenterDTO) => void;
  }): void {
    const ref = this.dialogs.open(OrganizationCostCenterFormDialogComponent, {
      header: opts.header,
      width: '78vw',
      style: { 'max-width': '920px' },
      contentStyle: { padding: '1.5rem', overflow: 'auto', 'max-height': '85vh' },
      modal: true,
      dismissableMask: false,
      closable: true,
      styleClass: 'rounded-2xl',
      data: opts.data
    });

    ref.onClose.subscribe((result: CostCenterDTO | null | undefined) => {
      if (!result) return;
      opts.handler(result);
    });
  }
}
