import { Injectable, signal, computed } from '@angular/core';
import { generateClient } from 'aws-amplify/api';

@Injectable({ providedIn: 'root' })
export class MetricsStore {
  private client = generateClient();

  // State (Signals)
  private _emissions = signal<any[]>([]);
  private _loading = signal<boolean>(false);

  // Selectors
  readonly emissions = computed(() => this._emissions());
  readonly isLoading = computed(() => this._loading());
  readonly totalEmissions = computed(() => 
    this._emissions().reduce((acc, curr) => acc + curr.value, 0)
  );

  async loadMetrics() {
    this._loading.set(true);
    try {
      // Sustituye 'getYearlyKPI' por tu query real de AppSync
      const result: any = await this.client.graphql({ 
        query: `query GetKPI { getYearlyKPI { id source value unit } }` 
      });
      this._emissions.set(result.data.getYearlyKPI);
    } catch (error) {
      console.error("Error cargando métricas:", error);
    } finally {
      this._loading.set(false);
    }
  }
}