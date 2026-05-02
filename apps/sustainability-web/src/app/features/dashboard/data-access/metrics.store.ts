import { Injectable, signal, computed, inject } from '@angular/core';
import { AppSyncApiService } from '../../../services/infrastructure/appsync-api.service';
import type { YearlyKpiRow } from '../../../core/models/api/appsync-api.models';

@Injectable({ providedIn: 'root' })
export class MetricsStore {
  private readonly api = inject(AppSyncApiService);

  private readonly _emissions = signal<YearlyKpiRow[]>([]);
  private readonly _loading = signal<boolean>(false);

  readonly emissions = computed(() => this._emissions());
  readonly isLoading = computed(() => this._loading());
  readonly totalEmissions = computed(() => this._emissions().reduce((acc, curr) => acc + curr.value, 0));

  async loadMetrics(): Promise<void> {
    this._loading.set(true);
    try {
      const year = String(new Date().getFullYear());
      const rows = await this.api.getYearlyKpi(year);
      this._emissions.set(rows);
    } catch (error) {
      console.error('Error cargando métricas:', error);
    } finally {
      this._loading.set(false);
    }
  }
}
