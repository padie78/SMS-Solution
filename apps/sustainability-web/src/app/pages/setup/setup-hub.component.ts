import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SETUP_PAGE_REGISTRY, type SetupPageKey } from './setup-pages.registry';

interface SetupHubCard {
  key: SetupPageKey;
  label: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-setup-hub',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Configuración maestra</h1>
        <p class="text-slate-500 mt-2 max-w-2xl text-sm leading-relaxed">
          Formularios alineados con las mutaciones GraphQL del pipeline SMS (setting-organization.sh). Requieren
          despliegue del schema AppSync y resolvers en la API.
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          *ngFor="let c of cards"
          [routerLink]="['/setup', c.key]"
          class="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-lg"
            >
              <i [class]="c.icon"></i>
            </span>
            <div class="min-w-0">
              <h2 class="font-bold text-slate-900 group-hover:text-emerald-800">{{ c.label }}</h2>
              <p class="text-xs text-slate-500 mt-1 leading-snug">{{ c.description }}</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  `
})
export class SetupHubComponent {
  readonly cards: SetupHubCard[] = (
    [
      ['organization', 'pi pi-building', 'Organización global'],
      ['branch', 'pi pi-map', 'Sucursal / planta'],
      ['building', 'pi pi-home', 'Edificio'],
      ['cost-center', 'pi pi-wallet', 'Centro de costos'],
      ['asset', 'pi pi-cog', 'Activo energético'],
      ['meter', 'pi pi-bolt', 'Medidor / IoT'],
      ['tariff', 'pi pi-dollar', 'Tarifa utilidad'],
      ['alert-rule', 'pi pi-bell', 'Regla de alerta'],
      ['user', 'pi pi-users', 'Usuario workspace'],
      ['production', 'pi pi-chart-line', 'Producción por periodo'],
      ['emission-factor', 'pi pi-cloud', 'Factor de emisión']
    ] as const
  ).map(([key, icon, label]) => ({
    key: key as SetupPageKey,
    icon,
    label,
    description: SETUP_PAGE_REGISTRY[key as SetupPageKey].subtitle
  }));
}
