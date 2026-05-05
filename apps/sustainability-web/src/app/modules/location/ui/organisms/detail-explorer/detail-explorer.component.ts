import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed } from '@angular/core';
import type { SmsLocationNode } from '../../../../../core/models/sms-location-node.model';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';

@Component({
  selector: 'sms-detail-explorer',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full min-w-0">
      <div *ngIf="node(); else empty" class="space-y-4">
        <div class="flex flex-wrap align-items-start justify-content-between gap-3">
          <div class="min-w-0">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-600 m-0">Properties</h2>
            <div class="text-sm text-slate-500 mt-1">
              {{ node()?.type }} · <span class="font-mono text-xs font-bold">{{ node()?.location_id }}</span>
            </div>
          </div>
        </div>

        <sms-dynamic-form [node]="node" />
      </div>

      <ng-template #empty>
        <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-slate-600 text-sm">
          Seleccioná un nodo del árbol para editar/agregar propiedades.
        </div>
      </ng-template>
    </div>
  `
})
export class DetailExplorerComponent {
  @Input({ required: true }) node!: () => SmsLocationNode | null;

  readonly _ = computed(() => this.node());
}

