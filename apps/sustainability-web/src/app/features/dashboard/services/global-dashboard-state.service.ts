import { Injectable, computed, signal } from '@angular/core';
import type { DashboardState } from '../../../core/models/global-dashboard.model';
import { MOCK_GLOBAL_DASHBOARD_STATE } from '../data/global-dashboard.mock';

@Injectable({ providedIn: 'root' })
export class GlobalDashboardStateService {
  private readonly _state = signal<DashboardState>(MOCK_GLOBAL_DASHBOARD_STATE);
  private readonly _searchQuery = signal('');

  readonly state = this._state.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();

  readonly filteredAiActions = computed(() => {
    const q = this._searchQuery().trim().toLowerCase();
    const items = this._state().ai_actions;
    if (!q) return items;
    return items.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.recommendation_id.toLowerCase().includes(q)
    );
  });

  setSearchQuery(value: string): void {
    this._searchQuery.set(value);
  }

  /** Permite que otros servicios (ej. control temporal) rehidraten el estado completo. */
  setState(next: DashboardState): void {
    this._state.set(next);
  }

  /** Simula refresh desde Dynamo / pipeline. */
  reloadFromUpstream(): void {
    this._state.set({ ...MOCK_GLOBAL_DASHBOARD_STATE });
  }
}
