import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed } from '@angular/core';
import type { SmsLocationNode } from '../../../core/models/sms-location-node.model';
import { LocationDtoFormsHostComponent } from '../../../features/location/ui/forms/location-dto-forms-host.component';

@Component({
  selector: 'sms-detail-explorer',
  standalone: true,
  imports: [CommonModule, LocationDtoFormsHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full min-w-0">
      <div *ngIf="node(); else empty" class="mx-auto w-full max-w-[980px] space-y-6">
        <header class="w-full border-b border-slate-200/90 pb-5">
          <h2 class="m-0 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Properties</h2>
          <div class="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900"
            >
              {{ node()?.type }}
            </span>
            <span class="break-all font-mono text-sm font-semibold text-slate-800">{{ node()?.location_id }}</span>
          </div>
        </header>

        <div class="w-full min-w-0">
          <sms-location-dto-forms-host [node]="node()!" />
        </div>
      </div>

      <ng-template #empty>
        <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-slate-600 text-sm">
          Seleccioná un nodo del árbol para editar/agregar propiedades.
        </div>
      </ng-template>
    </div>
  `
})
export class LocationDetailExplorerComponent {
  @Input({ required: true }) node!: () => SmsLocationNode | null;

  readonly _ = computed(() => this.node());
}

