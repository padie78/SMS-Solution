import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { TreeDragDropService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ContextMenuModule } from 'primeng/contextmenu';
import { DragDropModule } from 'primeng/dragdrop';
import { TreeModule } from 'primeng/tree';
import type { TreeNode } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { LocationTreeNodeTemplateComponent } from '../../molecules/location-tree-node-template/location-tree-node-template.component';
import type { SmsLocationNode, SmsLocationNodeType } from '../../../core/models/sms-location-node.model';
import { LocationService } from '../../../features/location/services/location.service';

function nextChildTypes(parentType: SmsLocationNodeType | null): SmsLocationNodeType[] {
  switch (parentType) {
    case null:
      return ['ORGANIZATION'];
    case 'ORGANIZATION':
      return ['REGION'];
    case 'REGION':
      return ['BRANCH'];
    case 'BRANCH':
      return ['BUILDING'];
    case 'BUILDING':
      return ['ASSET'];
    case 'ASSET':
      return ['METER'];
    case 'METER':
      return [];
    default:
      return [];
  }
}

function labelForType(t: SmsLocationNodeType): string {
  switch (t) {
    case 'ORGANIZATION':
      return 'Organización';
    case 'REGION':
      return 'Región';
    case 'BRANCH':
      return 'Sucursal';
    case 'BUILDING':
      return 'Edificio';
    case 'ASSET':
      return 'Activo';
    case 'METER':
      return 'Medidor';
    default:
      return 'Nodo';
  }
}

@Component({
  selector: 'sms-master-tree',
  standalone: true,
  imports: [
    CommonModule,
    TreeModule,
    DragDropModule,
    ContextMenuModule,
    ButtonModule,
    ConfirmDialogModule,
    LocationTreeNodeTemplateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, TreeDragDropService],
  styles: [
    `
      :host ::ng-deep .sms-tree.p-tree {
        border: 0;
      }

      :host ::ng-deep .sms-tree .p-tree-filter-container {
        padding: 0.75rem 0.75rem 0.5rem 0.75rem;
        border-bottom: 1px solid rgb(226 232 240);
        background: linear-gradient(to bottom, rgba(224, 231, 255, 0.85), rgba(255, 255, 255, 0));
      }

      :host ::ng-deep .sms-tree .p-tree-filter {
        border-radius: 0.75rem;
      }

      :host ::ng-deep .sms-tree .p-tree-container {
        padding: 0.5rem;
      }

      :host ::ng-deep .sms-tree .p-treenode {
        margin: 0.125rem 0;
      }

      :host ::ng-deep .sms-tree .p-treenode-content {
        border-radius: 0.75rem;
        padding: 0.25rem 0.35rem;
        gap: 0.5rem;
        transition:
          background-color 120ms ease,
          box-shadow 120ms ease;
      }

      :host ::ng-deep .sms-tree .p-treenode-content:hover {
        background: rgba(236, 253, 245, 0.9);
      }

      :host ::ng-deep .sms-tree .p-treenode-content.p-highlight {
        background: rgba(209, 250, 229, 0.9);
        box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.35);
      }

      :host ::ng-deep .sms-tree .p-tree-toggler {
        width: 2rem;
        height: 2rem;
        border-radius: 0.75rem;
      }

      :host ::ng-deep .sms-tree .p-tree-toggler:focus {
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
      }

      :host ::ng-deep .sms-tree .p-treenode-children {
        padding-left: 1.25rem;
        margin-left: 0.35rem;
        border-left: 1px dashed rgb(226 232 240);
      }

      :host ::ng-deep .sms-tree .p-treenode-content .p-treenode-label {
        flex: 1 1 auto;
        min-width: 0;
      }

      /* Drag & drop affordance */
      :host ::ng-deep .sms-tree .p-treenode-content.p-treenode-dragover {
        background: rgba(191, 219, 254, 0.55); /* sky */
        box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.25);
      }

      /* Scrollbar (WebKit) */
      :host ::ng-deep .sms-tree .p-tree-container::-webkit-scrollbar {
        width: 10px;
      }
      :host ::ng-deep .sms-tree .p-tree-container::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.35);
        border-radius: 999px;
        border: 2px solid rgba(255, 255, 255, 0.8);
      }
      :host ::ng-deep .sms-tree .p-tree-container::-webkit-scrollbar-thumb:hover {
        background: rgba(100, 116, 139, 0.45);
      }
    `
  ],
  template: `
    <div class="flex flex-column h-full gap-3">
      <div class="flex flex-wrap gap-2 align-items-start justify-content-between">
        <div class="min-w-0">
          <div class="flex flex-wrap align-items-center gap-2">
            <div class="text-xs font-black uppercase tracking-wider text-slate-600">Organización</div>
          </div>
          <div class="text-[11px] text-slate-500 mt-1">
            Creá nodos desde el menú contextual y movelos con drag &amp; drop respetando la jerarquía.
          </div>
        </div>
        <div class="flex flex-wrap gap-2 align-items-center justify-content-end shrink-0">
          <button
            pButton
            type="button"
            class="p-button-outlined border-round-xl text-xs font-bold"
            icon="pi pi-plus"
            label="Crear organización"
            (click)="createOrganization()"
          ></button>
          <button
            pButton
            type="button"
            class="p-button-text border-round-xl text-xs font-bold"
            icon="pi pi-refresh"
            label="Recargar"
            (click)="reload.emit()"
          ></button>
        </div>
      </div>

      <p-contextMenu #cm [model]="contextMenuItems()" />
      <p-confirmDialog />

      <div class="flex-1 min-h-0 overflow-hidden border-round-xl border border-slate-200 bg-white">
        <div class="h-full flex flex-column" *ngIf="(nodes?.length ?? 0) > 0; else emptyState">
          <p-tree
            class="sms-tree h-full overflow-auto"
            [value]="nodes"
            [filter]="true"
            filterMode="lenient"
            [filterBy]="'label'"
            filterPlaceholder="Buscar ubicaciones…"
            [lazy]="true"
            [loading]="loading"
            [draggableNodes]="true"
            [droppableNodes]="true"
            [contextMenu]="cm"
            selectionMode="single"
            [(selection)]="selection"
            (onNodeSelect)="onSelect($event)"
            (onNodeExpand)="onExpand($event)"
            (onNodeDrop)="onDrop($event)"
          >
            <ng-template pTemplate="default" let-node>
              <sms-tree-node-template
                [node]="asSmsNode(node)"
                (createChild)="onQuickCreateChild($event)"
                (edit)="onQuickEdit($event)"
                (delete)="onQuickDelete($event)"
              />
            </ng-template>
          </p-tree>
        </div>

        <ng-template #emptyState>
          <div class="h-full flex flex-column align-items-center justify-content-center gap-3 p-6 text-center">
            <div class="inline-flex align-items-center justify-content-center w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200">
              <i class="pi pi-sitemap text-indigo-700 text-xl" aria-hidden="true"></i>
            </div>
            <div class="max-w-md">
              <div class="text-sm font-black text-slate-900">Todavía no hay nodos en tu jerarquía</div>
              <div class="text-[12px] text-slate-500 mt-1 leading-relaxed">
                Empezá creando una <span class="font-semibold text-slate-700">Organización</span>. Luego vas a poder agregar
                regiones y el resto de niveles.
              </div>
              <div class="text-[11px] text-slate-400 mt-2" data-testid="location-tree-empty">
                Tip: si esto aparece y esperabas ver datos, revisá la carga de raíces ("loadRoots") o el mock storage.
              </div>
            </div>
            <button
              pButton
              type="button"
              class="p-button border-round-xl text-xs font-bold"
              icon="pi pi-plus"
              label="Crear organización"
              (click)="createOrganization()"
            ></button>
          </div>
        </ng-template>
      </div>
    </div>
  `
})
export class LocationMasterTreeComponent {
  /**
   * TODO (arquitectura): este organismo no debería depender del feature store.
   * Se mantiene temporalmente para evitar cambios extensivos en una sola pasada.
   */
  private readonly location = inject(LocationService);
  private readonly confirm = inject(ConfirmationService);

  @Input({ required: true }) nodes: SmsLocationNode[] = [];
  @Input() loading = false;

  @Output() selected = new EventEmitter<SmsLocationNode>();
  @Output() dropped = new EventEmitter<{ nodeId: string; newParentId: string | null }>();
  @Output() reload = new EventEmitter<void>();

  selection: TreeNode | null = null;

  asSmsNode(node: TreeNode): SmsLocationNode {
    return node as unknown as SmsLocationNode;
  }

  private readonly contextTarget = signal<SmsLocationNode | null>(null);

  readonly contextMenuItems = computed<MenuItem[]>(() => {
    const target = this.contextTarget();
    const parentType = target?.type ?? null;
    const create = nextChildTypes(parentType).map((t: SmsLocationNodeType) => ({
      label: `Crear ${labelForType(t)}`,
      icon: 'pi pi-plus',
      command: () => this.createChild(target, t)
    }));

    const common: MenuItem[] = [
      ...create,
      { separator: true },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        disabled: !target,
        command: () => (target ? void this.confirmDelete(target) : undefined)
      }
    ];
    return common;
  });

  onSelect(event: { node?: TreeNode }): void {
    const node = event.node?.data as SmsLocationNode | undefined;
    if (!node) return;
    this.contextTarget.set(node);
    this.selected.emit(node);
  }

  async onExpand(event: { node?: TreeNode }): Promise<void> {
    const node = event.node?.data as SmsLocationNode | undefined;
    if (!node) return;
    await this.location.ensureChildrenLoaded(node);
  }

  onDrop(event: { dragNode?: TreeNode | null; dropNode?: TreeNode | null }): void {
    const dragNode = event.dragNode ?? undefined;
    const drag = dragNode?.data as SmsLocationNode | undefined;
    const drop = (event.dropNode?.data as SmsLocationNode | undefined) ?? null;
    if (!drag) return;
    const verdict = this.location.validateDrop(drag, drop);
    if (!verdict.ok) {
      this.location.lastError.set(verdict.reason ?? 'Invalid drop');
      this.reload.emit();
      return;
    }
    this.dropped.emit({ nodeId: drag.location_id, newParentId: drop?.location_id ?? null });
  }

  async onQuickCreateChild(parent: SmsLocationNode): Promise<void> {
    const next = nextChildTypes(parent.type)[0];
    if (!next) {
      this.location.lastError.set(`"${parent.type}" no admite hijos.`);
      return;
    }
    await this.createChild(parent, next);
    this.reload.emit();
  }

  onQuickEdit(node: SmsLocationNode): void {
    this.selected.emit(node);
  }

  onQuickDelete(node: SmsLocationNode): void {
    void this.confirmDelete(node);
  }

  async createOrganization(): Promise<void> {
    this.location.lastError.set('Creando organización…');
    try {
      const created = await this.location.createNodeOptimistic({
        parent_id: null,
        type: 'ORGANIZATION',
        name: 'Organización · Nueva',
        status: 'ACTIVE'
      });
      this.location.lastError.set(null);
      this.selected.emit(created);
      this.reload.emit();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido creando organización';
      this.location.lastError.set(msg);
      throw e;
    }
  }

  async createRegion(parent: SmsLocationNode | null): Promise<void> {
    if (!parent || parent.type !== 'ORGANIZATION') {
      this.location.lastError.set('Primero creá o seleccioná una Organización.');
      return;
    }
    const created = await this.location.createNodeOptimistic({
      parent_id: parent.location_id,
      type: 'REGION',
      name: 'Región · Nueva',
      status: 'ACTIVE'
    });
    this.selected.emit(created);
  }

  private async createChild(parent: SmsLocationNode | null, type: SmsLocationNodeType): Promise<void> {
    const name = `${type} · New`;
    if (type === 'REGION') {
      await this.createRegion(parent);
      return;
    }
    await this.location.createNodeOptimistic({
      parent_id: parent?.location_id ?? null,
      type,
      name,
      status: 'ACTIVE'
    });
    if (parent) {
      parent.expanded = true;
      parent.leaf = false;
      parent.hasChildren = true;
    }
  }

  private async confirmDelete(node: SmsLocationNode): Promise<void> {
    try {
      const hasChildren = await this.location.hasDirectChildren(node);
      if (hasChildren) {
        this.location.lastError.set(
          `No se puede eliminar "${node.name}" porque tiene nodos hijos. Eliminá primero los hijos.`
        );
        return;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido cargando hijos para validar eliminación';
      this.location.lastError.set(msg);
      return;
    }
    this.confirm.confirm({
      message: `Delete \"${node.name}\" (${node.type})?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        try {
          await this.location.deleteNode(node.location_id);
          this.reload.emit();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Error desconocido eliminando nodo';
          this.location.lastError.set(msg);
        }
      }
    });
  }
}

