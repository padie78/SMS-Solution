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
import { SmsTreeNodeTemplateComponent } from '../../molecules/sms-tree-node-template/sms-tree-node-template.component';
import type { SmsLocationNode, SmsLocationNodeType } from '../../../../../core/models/sms-location-node.model';
import { LocationService } from '../../../services/location.service';

function nextChildTypes(parentType: SmsLocationNodeType | null): SmsLocationNodeType[] {
  switch (parentType) {
    case null:
      return ['REGION'];
    case 'REGION':
      return ['BRANCH'];
    case 'BRANCH':
      return ['BUILDING'];
    case 'BUILDING':
      return ['COST_CENTER'];
    case 'COST_CENTER':
      return ['ASSET'];
    case 'ASSET':
      return ['METER'];
    case 'METER':
      return [];
    default:
      return [];
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
    SmsTreeNodeTemplateComponent
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
        border-bottom: 1px solid rgb(226 232 240); /* slate-200 */
        background: linear-gradient(to bottom, rgba(236, 253, 245, 0.65), rgba(255, 255, 255, 0));
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
        padding: 0.5rem 0.5rem;
        gap: 0.5rem;
        transition:
          background-color 120ms ease,
          box-shadow 120ms ease;
      }

      :host ::ng-deep .sms-tree .p-treenode-content:hover {
        background: rgba(236, 253, 245, 0.9); /* emerald-50 */
      }

      :host ::ng-deep .sms-tree .p-treenode-content.p-highlight {
        background: rgba(209, 250, 229, 0.9); /* emerald-100 */
        box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.35); /* emerald-500 */
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
      }

      :host ::ng-deep .sms-tree .p-treenode-content .p-treenode-label {
        flex: 1 1 auto;
        min-width: 0;
      }
    `
  ],
  template: `
    <div class="flex flex-column h-full gap-3">
      <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
        <div class="flex flex-wrap gap-2 align-items-center">
          <p-button
            label="Create Region"
            icon="pi pi-plus"
            (onClick)="createRegion()"
            styleClass="p-button-outlined border-round-xl text-xs font-bold"
          />
          <p-button
            label="Reload"
            icon="pi pi-refresh"
            (onClick)="reload.emit()"
            styleClass="p-button-text border-round-xl text-xs font-bold"
          />
        </div>
      </div>

      <p-contextMenu #cm [model]="contextMenuItems()" />

      <div class="flex-1 min-h-0 overflow-hidden border-round-xl border border-slate-200 bg-white">
        <p-tree
        class="sms-tree h-full overflow-auto"
        [value]="nodes"
        [filter]="true"
        filterMode="lenient"
        [filterBy]="'label'"
        filterPlaceholder="Search locations…"
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
        <ng-template let-node pTemplate="default">
          <sms-tree-node-template [node]="node.data" />
        </ng-template>
      </p-tree>
      </div>
    </div>
  `
})
export class MasterTreeComponent {
  private readonly location = inject(LocationService);
  private readonly confirm = inject(ConfirmationService);

  @Input({ required: true }) nodes: SmsLocationNode[] = [];
  @Input() loading = false;

  @Output() selected = new EventEmitter<SmsLocationNode>();
  @Output() dropped = new EventEmitter<{ nodeId: string; newParentId: string | null }>();
  @Output() reload = new EventEmitter<void>();

  selection: TreeNode | null = null;

  private readonly contextTarget = signal<SmsLocationNode | null>(null);

  readonly contextMenuItems = computed<MenuItem[]>(() => {
    const target = this.contextTarget();
    const parentType = target?.type ?? null;
    const create = nextChildTypes(parentType).map((t) => ({
      label: `Create ${t}`,
      icon: 'pi pi-plus',
      command: () => this.createChild(target, t)
    }));

    const common: MenuItem[] = [
      ...create,
      { separator: true },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        disabled: !target,
        command: () => (target ? this.confirmDelete(target) : undefined)
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

  async createRegion(): Promise<void> {
    await this.location.createNodeOptimistic({
      parent_id: null,
      type: 'REGION',
      name: 'REGION · New',
      status: 'ACTIVE'
    });
  }

  private async createChild(parent: SmsLocationNode | null, type: SmsLocationNodeType): Promise<void> {
    const name = `${type} · New`;
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

  private confirmDelete(node: SmsLocationNode): void {
    this.confirm.confirm({
      message: `Delete "${node.name}" (${node.type})?`,
      header: 'Confirm delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => void this.location.deleteNode(node.location_id)
    });
  }
}

