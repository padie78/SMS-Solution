import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import type { MenuItem } from 'primeng/api';
import { SplitterModule } from 'primeng/splitter';
import { MasterTreeComponent } from '../../ui/organisms/master-tree/master-tree.component';
import { DetailExplorerComponent } from '../../ui/organisms/detail-explorer/detail-explorer.component';
import { LocationService } from '../../services/location.service';
import type { SmsLocationNode } from '../../../../core/models/sms-location-node.model';

@Component({
  selector: 'sms-location-manager-page',
  standalone: true,
  imports: [CommonModule, SplitterModule, BreadcrumbModule, MasterTreeComponent, DetailExplorerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[1600px] mx-auto space-y-6 pb-12 min-w-0">
      <header class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-xs font-bold text-emerald-700 m-0">SMS · Trust &amp; Compliance</p>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight mt-1 m-0">Location Manager</h1>
          <p class="text-slate-500 text-sm max-w-3xl leading-relaxed mt-2 m-0">
            Administra la jerarquía de ubicación y energía: Region → Branch → Building → Cost Center → Asset → Meter.
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
        <p-splitter [panelSizes]="[40, 60]" styleClass="min-h-[720px]">
          <ng-template pTemplate>
            <div class="h-full p-4 md:p-5 border-r border-slate-200 bg-slate-50/40 min-w-0">
              <sms-master-tree
                [nodes]="location.tree()"
                [loading]="location.loading()"
                (selected)="onNodeSelected($event)"
                (dropped)="onNodeDropped($event)"
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

  readonly breadcrumbItems = computed<MenuItem[]>(() => {
    const nodes = this.location.breadcrumb();
    if (nodes.length === 0) {
      return [{ label: 'Locations' }];
    }
    return nodes.map((n) => ({
      label: n.name,
      title: `${n.type} · ${n.location_id}`
    }));
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

  async reload(): Promise<void> {
    await this.location.loadRoots();
  }
}

