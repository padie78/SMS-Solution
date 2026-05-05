import { Injectable, computed, signal } from '@angular/core';

export type DashboardLayer =
  | 'DESCRIPTIVE'
  | 'PREDICTIVE'
  | 'PRESCRIPTIVE'
  | 'OPERATIVE'
  | 'AUDIT'
  | 'STRATEGIC'
  | 'ESG';

export interface DashboardLayerOption {
  readonly label: string;
  readonly value: DashboardLayer;
}

const ALL_LAYERS: readonly DashboardLayer[] = [
  'DESCRIPTIVE',
  'PREDICTIVE',
  'PRESCRIPTIVE',
  'OPERATIVE',
  'AUDIT',
  'STRATEGIC',
  'ESG'
] as const;

@Injectable({ providedIn: 'root' })
export class DashboardLayerVisibilityService {
  private readonly _selected = signal<readonly DashboardLayer[]>([...ALL_LAYERS]);

  readonly selected = this._selected.asReadonly();

  readonly options = computed(
    (): DashboardLayerOption[] => [
      { label: 'Capa descriptiva', value: 'DESCRIPTIVE' },
      { label: 'Capa predictiva', value: 'PREDICTIVE' },
      { label: 'Capa prescriptiva', value: 'PRESCRIPTIVE' },
      { label: 'Capa operativa', value: 'OPERATIVE' },
      { label: 'Auditoría', value: 'AUDIT' },
      { label: 'Capa estratégica', value: 'STRATEGIC' },
      { label: 'ESG', value: 'ESG' }
    ]
  );

  setSelected(next: readonly DashboardLayer[]): void {
    // Evita estado vacío (deja al menos 1).
    const uniq = Array.from(new Set(next));
    this._selected.set(uniq.length ? uniq : ['DESCRIPTIVE']);
  }

  isOn(layer: DashboardLayer): boolean {
    return this._selected().includes(layer);
  }
}

