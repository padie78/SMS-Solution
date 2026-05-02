import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SETUP_PAGE_REGISTRY, type SetupPageKey } from './setup-pages.registry';

@Component({
  selector: 'app-setup-locations-hub',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Ubicaciones y activos</h1>
        <p class="text-slate-500 mt-2 text-sm leading-relaxed">
          Flujo recomendado: sucursal → edificio → centro de costos → activo → medidor → tarifa → alertas.
        </p>
        <a
          routerLink="/setup/hierarchy"
          class="inline-flex mt-4 items-center gap-2 text-sm font-bold text-emerald-700 hover:underline"
        >
          <i class="pi pi-table"></i>
          Abrir vista árbol &amp; grillas CRUD
        </a>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          *ngFor="let k of keys"
          [routerLink]="['/setup', k]"
          class="rounded-2xl border border-slate-200 bg-white p-6 hover:border-emerald-300 shadow-sm transition-colors"
        >
          <h2 class="font-bold text-slate-900">{{ registry[k].title }}</h2>
          <p class="text-xs text-slate-500 mt-2">{{ registry[k].subtitle }}</p>
        </a>
      </div>
    </div>
  `
})
export class SetupLocationsHubComponent {
  readonly registry = SETUP_PAGE_REGISTRY;
  readonly keys: SetupPageKey[] = [
    'branch',
    'building',
    'cost-center',
    'asset',
    'meter',
    'tariff',
    'alert-rule'
  ];
}
