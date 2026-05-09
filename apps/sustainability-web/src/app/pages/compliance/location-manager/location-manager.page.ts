import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import type { MenuItem } from 'primeng/api';
import { SplitterModule } from 'primeng/splitter';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import type { CostCenterDTO } from '@sms/common';
import { LocationMasterTreeComponent } from '../../../ui/organisms/location-master-tree/location-master-tree.component';
import { LocationDetailExplorerComponent } from '../../../ui/organisms/location-detail-explorer/location-detail-explorer.component';
import { LocationService } from '../../../features/location/services/location.service';
import type { SmsLocationNode } from '../../../core/models/sms-location-node.model';
import { OrganizationCostCenterRegistryService } from '../../../services/state/organization-cost-center-registry.service';
import { OrganizationCostCenterFormDialogComponent } from '../../../features/location/ui/forms/organization-cost-center-form-dialog.component';
import { NotificationService } from '../../../services/ui/notification.service';

type QuickAction = 'openCostCenters' | 'openTariffs' | 'openAssetsInventory';

@Component({
  selector: 'sms-location-manager-page',
  standalone: true,
  imports: [
    CommonModule,
    SplitterModule,
    BreadcrumbModule,
    DynamicDialogModule,
    LocationMasterTreeComponent,
    LocationDetailExplorerComponent
  ],
  providers: [DialogService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host ::ng-deep .sms-location-splitter.p-splitter {
        background: transparent;
      }

      /* Hace que el "Location Manager" se perciba como el módulo principal:
         panel izquierdo más sólido, gutter más sutil, y mejor contraste. */
      :host ::ng-deep .sms-location-splitter .p-splitter-gutter {
        background: rgb(241 245 249); /* slate-100 */
      }
      :host ::ng-deep .sms-location-splitter .p-splitter-gutter .p-splitter-gutter-handle {
        background: rgb(226 232 240); /* slate-200 */
        border-radius: 999px;
      }
    `
  ],
  template: `
    <div class="max-w-[1600px] mx-auto space-y-5 md:space-y-6 pb-12 min-w-0">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-xs font-bold text-emerald-700 m-0">SMS · Trust &amp; Compliance</p>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-3xl font-black text-slate-900 tracking-tight mt-1 m-0">Location Manager</h1>
            <span
              class="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800"
            >
              UI v2
            </span>
          </div>
          <p class="text-slate-500 text-sm max-w-3xl leading-relaxed mt-2 m-0">
            La raíz es tu <strong class="text-slate-700">Organización</strong>. Desde ahí modelás la jerarquía operativa y
            energética: <span class="font-mono text-slate-600">Region → Branch → Building → Cost Center → Asset → Meter</span>.
            Usá el árbol para crear nodos y <strong class="text-slate-700">drag &amp; drop</strong> para reubicar (valida la
            jerarquía).
          </p>
        </div>
        <div class="flex flex-wrap gap-2 align-items-center justify-content-end shrink-0">
          <div class="border border-slate-200 rounded-xl px-3 py-2 bg-white">
            <p-breadcrumb [model]="breadcrumbItems()" styleClass="bg-transparent border-none p-0 text-sm" />
          </div>
        </div>
      </header>

      <section
        class="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 md:p-5 text-rose-800 text-sm"
        *ngIf="location.lastError() as err"
      >
        <div class="flex align-items-start gap-2">
          <i class="pi pi-exclamation-triangle mt-1"></i>
          <div class="min-w-0">
            <div class="font-black uppercase tracking-wider text-[11px]">Error</div>
            <div class="break-words">{{ err }}</div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white shadow-2 min-w-0 overflow-hidden">
        <p-splitter [panelSizes]="[46, 54]" styleClass="min-h-[760px] sms-location-splitter">
          <ng-template pTemplate>
            <div
              class="h-full p-4 md:p-5 border-r border-slate-200 min-w-0 bg-gradient-to-b from-slate-50/70 via-white to-white"
            >
              <sms-master-tree
                [nodes]="location.tree()"
                [loading]="location.loading()"
                (selected)="onNodeSelected($event)"
                (dropped)="onNodeDropped($event)"
                (quickAction)="onQuickAction($event)"
                (reload)="reload()"
              />
            </div>
          </ng-template>
          <ng-template pTemplate>
            <div class="h-full p-4 md:p-6 overflow-auto min-w-0">
              <sms-detail-explorer [node]="location.selectedNode" />
            </div>
          </ng-template>
        </p-splitter>
      </section>
    </div>
  `
})
export class LocationManagerPage implements OnInit {
  readonly location = inject(LocationService);
  private readonly dialog = inject(DialogService);
  private readonly costCenterRegistry = inject(OrganizationCostCenterRegistryService);
  private readonly notify = inject(NotificationService);

  readonly breadcrumbItems = computed<MenuItem[]>(() => {
    const nodes = this.location.breadcrumb();
    if (nodes.length === 0) {
      return [{ label: 'Organización' }];
    }
    return [
      { label: 'Organización', title: 'Root' },
      ...nodes.map((n) => ({
        label: n.name,
        title: `${n.type} · ${n.location_id}`
      }))
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.location.loadRoots();
  }

  onNodeSelected(node: SmsLocationNode): void {
    this.location.selectedNode.set(node);
  }

  async onNodeDropped(ev: { nodeId: string; newParentId: string | null }): Promise<void> {
    await this.location.updateParent(ev.nodeId, ev.newParentId);
  }

  /**
   * Acciones rápidas del menú contextual del árbol.
   * - `openCostCenters` (sólo Organization): abre el modal de Cost Center,
   *   persiste el resultado vía registry y recarga el árbol para reflejarlo
   *   en el badge KPI / formulario sin cambiar de pantalla.
   */
  onQuickAction(ev: { node: SmsLocationNode; action: QuickAction }): void {
    // Selecciono el nodo (el detail explorer también muestra el form correspondiente).
    this.location.selectedNode.set(ev.node);

    switch (ev.action) {
      case 'openCostCenters':
        if (ev.node.type === 'ORGANIZATION') {
          this.openOrganizationCostCenterDialog(ev.node);
        }
        break;
      case 'openTariffs':
      case 'openAssetsInventory':
        // Reservadas para cuando agreguemos modales directos para Branch / Building.
        break;
    }
  }

  async reload(): Promise<void> {
    await this.location.loadRoots();
  }

  /** Abre el modal de creación de Cost Center y persiste al cerrar. */
  private openOrganizationCostCenterDialog(orgNode: SmsLocationNode): void {
    const ref = this.dialog.open(OrganizationCostCenterFormDialogComponent, {
      header: `Nuevo centro de costo · ${orgNode.name}`,
      width: '78vw',
      style: { 'max-width': '920px' },
      contentStyle: { padding: '1.5rem', overflow: 'auto', 'max-height': '85vh' },
      modal: true,
      dismissableMask: false,
      closable: true,
      styleClass: 'rounded-2xl',
      data: { organizationId: orgNode.location_id, costCenter: null }
    });

    ref.onClose.subscribe(async (result: CostCenterDTO | null | undefined) => {
      if (!result) return;
      try {
        await this.costCenterRegistry.addCostCenter(orgNode.location_id, result);
        this.notify.success(
          'Centro de costo creado',
          `Se agregó "${result.name}" a "${orgNode.name}".`
        );
        await this.reload();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error desconocido al crear el centro de costo.';
        this.notify.error('No se pudo crear el centro de costo', msg);
      }
    });
  }
}

